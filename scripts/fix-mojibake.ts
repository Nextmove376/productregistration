/**
 * Finds and repairs mojibake, in source files and in the database.
 *
 * Reports by default and changes nothing. Repair is opt-in and always writes a restorable
 * backup first.
 *
 *   npx tsx scripts/fix-mojibake.ts                # report source files
 *   npx tsx scripts/fix-mojibake.ts --write        # repair source files (backup first)
 *   npx tsx scripts/fix-mojibake.ts --db           # report database rows
 *   npx tsx scripts/fix-mojibake.ts --db --write   # repair database rows (backup first)
 *   npx tsx scripts/fix-mojibake.ts --check        # exit 1 if anything is corrupted (CI)
 *   npx tsx scripts/fix-mojibake.ts --restore backups/mojibake-<stamp>.json
 *
 * The database pass does not hardcode a column list. It asks `information_schema` which
 * columns hold text and what each table's primary key is, then repairs every one of them.
 * That is deliberate: this project has already lost a day to code that assumed it knew the
 * shape of the `settings` table and was wrong about the name of its primary key.
 *
 * See `lib/mojibake.ts` for why the corruption is exactly invertible.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import './test-env'; // placeholder DB credentials so a file-only run needs no .env
import { findMojibake, fixMojibake } from '../lib/mojibake';
// The database pass itself lives in `lib/` so the admin panel can run the same scan and
// the same repair. Type-only import: erased at runtime, so a file-only run still never
// loads the connection pool.
import type { RowFinding } from '../lib/mojibake-db';

const ROOT = path.resolve(import.meta.dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', '.vscode', '.idea',
  'uploads', 'backups', 'out', 'dist', 'build',
  // Legacy duplicate of an older app. Not built, not imported, not touched.
  'site',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.mdx', '.css', '.scss', '.sql',
  '.txt', '.html', '.svg', '.yml', '.yaml',
]);

interface FileFinding {
  file: string;
  before: string;
  after: string;
  sequences: { broken: string; fixed: string }[];
}

/* ------------------------------------------------------------------ *
 * Source files
 * ------------------------------------------------------------------ */

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      yield path.join(dir, entry.name);
    }
  }
}

async function scanFiles(): Promise<FileFinding[]> {
  const findings: FileFinding[] = [];
  for await (const file of walk(ROOT)) {
    const before = await readFile(file, 'utf8');
    const after = fixMojibake(before);
    if (after !== before) {
      findings.push({
        file: path.relative(ROOT, file),
        before,
        after,
        sequences: findMojibake(before),
      });
    }
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file));
}

/* ------------------------------------------------------------------ *
 * Database
 * ------------------------------------------------------------------ */

/*
 * Both of these now delegate to `lib/mojibake-db.ts`, so the CLI and the admin panel's
 * "Check encoding" / "Fix encoding" buttons run byte-for-byte the same scan and the same
 * transaction. Imported dynamically so a file-only run never loads the pool.
 */

async function scanDatabase(): Promise<{ findings: RowFinding[]; skipped: string[] }> {
  const { scanDatabaseMojibake } = await import('../lib/mojibake-db');
  return scanDatabaseMojibake();
}

async function repairDatabase(findings: RowFinding[]): Promise<number> {
  const { repairDatabaseMojibake } = await import('../lib/mojibake-db');
  return repairDatabaseMojibake(findings);
}

/* ------------------------------------------------------------------ *
 * Backup / restore
 * ------------------------------------------------------------------ */

interface Backup {
  createdAt: string;
  files: { file: string; content: string }[];
  rows: { table: string; pkColumn: string; pkValue: string | number; column: string; content: string }[];
}

async function writeBackup(files: FileFinding[], rows: RowFinding[]): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ROOT, 'backups');
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `mojibake-${stamp}.json`);

  const backup: Backup = {
    createdAt: new Date().toISOString(),
    files: files.map((f) => ({ file: f.file, content: f.before })),
    rows: rows.map((r) => ({
      table: r.table, pkColumn: r.pkColumn, pkValue: r.pkValue, column: r.column, content: r.before,
    })),
  };

  await writeFile(target, JSON.stringify(backup, null, 2), 'utf8');
  return path.relative(ROOT, target);
}

async function restore(backupPath: string): Promise<void> {
  const backup: Backup = JSON.parse(await readFile(path.resolve(ROOT, backupPath), 'utf8'));

  for (const { file, content } of backup.files) {
    await writeFile(path.join(ROOT, file), content, 'utf8');
    console.log(`restored ${file}`);
  }

  if (backup.rows.length > 0) {
    const { default: pool } = await import('../lib/db');
    for (const r of backup.rows) {
      await pool.execute(
        `UPDATE \`${r.table}\` SET \`${r.column}\` = ? WHERE \`${r.pkColumn}\` = ?`,
        [r.content, r.pkValue]
      );
      console.log(`restored ${r.table}.${r.column} #${r.pkValue}`);
    }
    await pool.end();
  }

  console.log(`\nRestored ${backup.files.length} file(s) and ${backup.rows.length} row(s) from ${backupPath}.`);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const check = args.includes('--check');
  const doDb = args.includes('--db');
  const restoreIndex = args.indexOf('--restore');

  if (restoreIndex !== -1) {
    const target = args[restoreIndex + 1];
    if (!target) {
      console.error('--restore needs a backup file path');
      process.exitCode = 1;
      return;
    }
    await restore(target);
    return;
  }

  const files = await scanFiles();

  let rows: RowFinding[] = [];
  let skippedTables: string[] = [];
  if (doDb) {
    const result = await scanDatabase();
    rows = result.findings;
    skippedTables = result.skipped;
  }

  // Report
  if (files.length === 0 && rows.length === 0) {
    console.log('No mojibake found.');
    if (skippedTables.length) console.log(`\nNot scanned: ${skippedTables.join(', ')}`);
    const { default: pool } = doDb ? await import('../lib/db') : { default: null };
    await pool?.end();
    return;
  }

  if (files.length) {
    console.log(`\n${files.length} file(s) with mojibake:\n`);
    for (const f of files) {
      const summary = f.sequences.map((s) => `${s.broken} -> ${s.fixed}`).join('  ');
      console.log(`  ${f.file}\n      ${summary}`);
    }
  }

  if (rows.length) {
    console.log(`\n${rows.length} database value(s) with mojibake:\n`);
    for (const r of rows) {
      console.log(`  ${r.table}.${r.column} #${r.pkValue}`);
    }
  }

  if (skippedTables.length) {
    console.log(`\nNot scanned (cannot address a single row): ${skippedTables.join(', ')}`);
  }

  if (check) {
    console.error('\nEncoding check failed. Run with --write to repair.');
    process.exitCode = 1;
    const { default: pool } = doDb ? await import('../lib/db') : { default: null };
    await pool?.end();
    return;
  }

  if (!write) {
    console.log('\nNothing was changed. Re-run with --write to repair (a backup is written first).');
    const { default: pool } = doDb ? await import('../lib/db') : { default: null };
    await pool?.end();
    return;
  }

  const backupPath = await writeBackup(files, rows);
  console.log(`\nBackup written to ${backupPath}`);

  for (const f of files) {
    await writeFile(path.join(ROOT, f.file), f.after, 'utf8');
  }
  console.log(`Repaired ${files.length} file(s).`);

  if (rows.length) {
    const updated = await repairDatabase(rows);
    console.log(`Repaired ${updated} database value(s).`);
  }

  if (doDb) {
    const { default: pool } = await import('../lib/db');
    await pool.end();
  }

  console.log(`\nTo undo: npx tsx scripts/fix-mojibake.ts --restore ${backupPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
