/**
 * Logical database backup and restore.
 *
 * Written because the standing instruction for this work was "create/verify a backup
 * first" and there was no way to do that. Everything else in this repo that mutates
 * the database now backs up what it touches (`scripts/fix-mojibake.ts`,
 * `scripts/seed-service-body.ts`), but a per-script backup only protects that
 * script's blast radius. This one captures the whole schema.
 *
 *   npx tsx scripts/backup-db.ts                      # full backup to backups/
 *   npx tsx scripts/backup-db.ts --tables settings,services
 *   npx tsx scripts/backup-db.ts --schema-only
 *   npx tsx scripts/backup-db.ts --verify backups/db-<stamp>.sql
 *   npx tsx scripts/backup-db.ts --restore backups/db-<stamp>.sql --yes
 *
 * **Why not `mysqldump`.** This deploys to Hostinger shared hosting, where the
 * MySQL client binaries are frequently absent from the app container and the
 * database is reached over the network. A dump that depends on a binary the host
 * may not have is a backup strategy that fails exactly when it is needed. This
 * reads through the same `mysql2` pool the app already uses, so if the app can
 * reach the database, so can the backup.
 *
 * The output is plain SQL that phpMyAdmin will import, which matters because
 * phpMyAdmin is the only database access this deployment reliably has.
 *
 * **Restore is deliberately awkward.** It requires `--yes`, refuses to run without
 * a fresh safety backup of what it is about to replace, and prints the row counts
 * it is overwriting. Restores happen on bad days; the friction is the point.
 */

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pool from '../lib/db';

const ROOT = path.resolve(import.meta.dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups');

/** Rows per INSERT statement. Large enough to be fast, small enough for phpMyAdmin. */
const ROWS_PER_INSERT = 200;

/* ------------------------------------------------------------------ *
 * Value encoding
 * ------------------------------------------------------------------ */

/**
 * One value as a SQL literal.
 *
 * Hand-rolled rather than using `pool.escape` for `Date` and `Buffer`, because the
 * output has to survive a round trip through phpMyAdmin's importer, which is
 * stricter than the wire protocol about datetime formatting and binary literals.
 */
function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  if (value instanceof Date) {
    // 'YYYY-MM-DD HH:MM:SS' in UTC. The pool is configured `timezone: 'Z'`, so
    // reading back through it returns the same instant.
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }

  if (Buffer.isBuffer(value)) return `0x${value.toString('hex')}`;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'object') return quote(JSON.stringify(value));

  return quote(String(value));
}

/**
 * A quoted SQL string.
 *
 * Escapes backslash and quote, plus the control characters that would otherwise
 * end the statement early. `\Z` is escaped because a literal 0x1A in a file makes
 * some Windows-side importers treat it as end-of-file.
 */
function quote(s: string): string {
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
    .replace(/\x1a/g, '\\Z');
  return `'${escaped}'`;
}

/* ------------------------------------------------------------------ *
 * Reading the schema
 * ------------------------------------------------------------------ */

async function listTables(): Promise<string[]> {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`
  );
  return (rows as { TABLE_NAME: string }[]).map((r) => r.TABLE_NAME);
}

async function createStatement(table: string): Promise<string> {
  const [rows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
  const row = (rows as Record<string, string>[])[0];
  // The column is named 'Create Table' for tables and 'Create View' for views.
  return row['Create Table'] ?? row['Create View'] ?? '';
}

async function rowCount(table: string): Promise<number> {
  const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}

/* ------------------------------------------------------------------ *
 * Writing the dump
 * ------------------------------------------------------------------ */

interface DumpOptions {
  tables?: string[];
  schemaOnly?: boolean;
}

async function dump(options: DumpOptions = {}): Promise<{ file: string; tables: number; rows: number }> {
  const all = await listTables();
  const tables = options.tables?.length
    ? all.filter((t) => options.tables!.some((w) => w.toLowerCase() === t.toLowerCase()))
    : all;

  const missing = (options.tables ?? []).filter(
    (w) => !all.some((t) => t.toLowerCase() === w.toLowerCase())
  );
  if (missing.length) {
    throw new Error(`No such table(s): ${missing.join(', ')}. Present: ${all.join(', ')}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(BACKUP_DIR, { recursive: true });
  const target = path.join(BACKUP_DIR, `db-${stamp}.sql`);

  const parts: string[] = [];
  let totalRows = 0;

  parts.push(
    `-- Logical backup written by scripts/backup-db.ts`,
    `-- Created: ${new Date().toISOString()}`,
    `-- Tables: ${tables.length}${options.schemaOnly ? ' (schema only)' : ''}`,
    `--`,
    `-- Restore:  npx tsx scripts/backup-db.ts --restore <this file> --yes`,
    `-- Or import this file directly in phpMyAdmin.`,
    ``,
    // utf8mb4 throughout: the mojibake this project had to repair came from a
    // charset mismatch, and a backup that re-introduces one is worse than none.
    `SET NAMES utf8mb4;`,
    `SET FOREIGN_KEY_CHECKS = 0;`,
    `SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';`,
    ``
  );

  for (const table of tables) {
    const count = options.schemaOnly ? 0 : await rowCount(table);
    process.stdout.write(`  ${table} (${options.schemaOnly ? 'schema' : `${count} rows`})\n`);

    parts.push(
      `-- ------------------------------------------------------------`,
      `-- ${table}`,
      `-- ------------------------------------------------------------`,
      `DROP TABLE IF EXISTS \`${table}\`;`,
      `${await createStatement(table)};`,
      ``
    );

    if (options.schemaOnly || count === 0) {
      parts.push('');
      continue;
    }

    // Paged so a large table cannot be pulled into memory all at once. Ordered by
    // the primary key where there is one so the dump is reproducible.
    const [columnRows] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_KEY FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [table]
    );
    const columns = columnRows as { COLUMN_NAME: string; COLUMN_KEY: string }[];
    const names = columns.map((c) => c.COLUMN_NAME);
    const pk = columns.filter((c) => c.COLUMN_KEY === 'PRI').map((c) => c.COLUMN_NAME);
    const order = pk.length ? ` ORDER BY ${pk.map((c) => `\`${c}\``).join(', ')}` : '';
    const columnList = names.map((c) => `\`${c}\``).join(', ');

    for (let offset = 0; offset < count; offset += ROWS_PER_INSERT) {
      const [pageRows] = await pool.query(
        `SELECT ${columnList} FROM \`${table}\`${order} LIMIT ${ROWS_PER_INSERT} OFFSET ${offset}`
      );
      const values = (pageRows as Record<string, unknown>[]).map(
        (row) => `(${names.map((n) => literal(row[n])).join(', ')})`
      );
      if (values.length === 0) break;
      parts.push(`INSERT INTO \`${table}\` (${columnList}) VALUES`, `${values.join(',\n')};`, ``);
      totalRows += values.length;
    }
  }

  parts.push(`SET FOREIGN_KEY_CHECKS = 1;`, ``);

  await writeFile(target, parts.join('\n'), 'utf8');
  return { file: path.relative(ROOT, target), tables: tables.length, rows: totalRows };
}

/* ------------------------------------------------------------------ *
 * Verify
 * ------------------------------------------------------------------ */

/**
 * Checks a backup is intact without touching the database.
 *
 * "Verify a backup" has to mean more than "the file exists" — a truncated dump
 * looks fine until the day it is needed. This confirms the file ends where it
 * should and that every table it claims to contain has a CREATE statement.
 */
async function verify(file: string): Promise<void> {
  const target = path.resolve(ROOT, file);
  const info = await stat(target);
  const sql = await readFile(target, 'utf8');

  const claimed = Number(/^-- Tables: (\d+)/m.exec(sql)?.[1] ?? '0');
  const creates = [...sql.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map((m) => m[1]);
  const inserts = [...sql.matchAll(/^INSERT INTO `([^`]+)`/gm)].length;
  const terminated = sql.trimEnd().endsWith('SET FOREIGN_KEY_CHECKS = 1;');

  console.log(`\n${file}`);
  console.log(`  size            ${(info.size / 1024).toFixed(1)} KB`);
  console.log(`  created         ${/^-- Created: (.+)$/m.exec(sql)?.[1] ?? 'unknown'}`);
  console.log(`  tables claimed  ${claimed}`);
  console.log(`  CREATE TABLE    ${creates.length}`);
  console.log(`  INSERT batches  ${inserts}`);
  console.log(`  complete        ${terminated ? 'yes' : 'NO - file is truncated'}`);

  const problems: string[] = [];
  if (!terminated) problems.push('the file does not end with its terminator, so it is truncated');
  if (claimed !== creates.length) {
    problems.push(`header claims ${claimed} tables but ${creates.length} CREATE statements are present`);
  }
  if (creates.length === 0) problems.push('no CREATE TABLE statements at all');

  if (problems.length) {
    console.error(`\nBackup is NOT usable:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nBackup looks intact. Tables: ${creates.join(', ')}`);
}

/* ------------------------------------------------------------------ *
 * Restore
 * ------------------------------------------------------------------ */

/**
 * Splits a dump into statements.
 *
 * Naive `split(';')` breaks on semicolons inside string literals, of which this
 * schema has many (JSON bodies, HTML post content). This tracks quote state and
 * escapes instead.
 */
function statements(sql: string): string[] {
  const out: string[] = [];
  let current = '';
  let inString: string | null = null;
  let escaped = false;

  for (const char of sql) {
    current += char;

    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && char === '\\') {
      escaped = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      inString = char;
      continue;
    }
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed !== ';') out.push(trimmed.slice(0, -1));
      current = '';
    }
  }

  const tail = current.trim();
  if (tail) out.push(tail);

  // Comment-only fragments left between statements are not worth sending.
  return out.filter((s) => s.split('\n').some((line) => line.trim() && !line.trim().startsWith('--')));
}

async function restore(file: string, confirmed: boolean): Promise<void> {
  const target = path.resolve(ROOT, file);
  const sql = await readFile(target, 'utf8');

  if (!sql.trimEnd().endsWith('SET FOREIGN_KEY_CHECKS = 1;')) {
    throw new Error(
      `${file} is truncated (missing its terminator). Refusing to restore from an incomplete backup.`
    );
  }

  const willReplace = [...sql.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map((m) => m[1]);

  console.log(`\nRestoring ${file}`);
  console.log(`This DROPS and recreates ${willReplace.length} table(s): ${willReplace.join(', ')}`);
  console.log(`\nCurrent contents that will be destroyed:`);
  const existing = await listTables();
  for (const table of willReplace) {
    if (!existing.includes(table)) {
      console.log(`  ${table}: does not currently exist`);
      continue;
    }
    console.log(`  ${table}: ${await rowCount(table)} rows`);
  }

  if (!confirmed) {
    console.log(`\nNothing was changed. Re-run with --yes to proceed.`);
    return;
  }

  // A restore that overwrites the only copy of the current state is not a
  // recovery, it is a second incident.
  console.log(`\nBacking up current state first...`);
  const safety = await dump({ tables: willReplace.filter((t) => existing.includes(t)) });
  console.log(`Safety backup: ${safety.file}`);

  const conn = await pool.getConnection();
  let applied = 0;
  try {
    for (const statement of statements(sql)) {
      await conn.query(statement);
      applied++;
    }
  } catch (err) {
    console.error(`\nFailed after ${applied} statement(s).`);
    console.error(`DDL cannot be rolled back, so the schema may be half-restored.`);
    console.error(`Recover with: npx tsx scripts/backup-db.ts --restore ${safety.file} --yes`);
    throw err;
  } finally {
    conn.release();
  }

  console.log(`\nRestored ${applied} statement(s) from ${file}.`);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

async function latestBackup(): Promise<string | null> {
  try {
    const files = (await readdir(BACKUP_DIR))
      .filter((f) => f.startsWith('db-') && f.endsWith('.sql'))
      .sort();
    return files.length ? path.join('backups', files[files.length - 1]) : null;
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);

  const restorePath = flagValue(args, '--restore');
  if (restorePath) {
    await restore(restorePath, args.includes('--yes'));
    return;
  }

  const verifyPath = flagValue(args, '--verify');
  if (verifyPath !== undefined) {
    // Bare `--verify` checks the most recent backup, which is the common case.
    const chosen = verifyPath.startsWith('--') ? null : verifyPath;
    const file = chosen ?? (await latestBackup());
    if (!file) {
      console.error('No backup found in backups/. Run without flags to create one.');
      process.exitCode = 1;
      return;
    }
    await verify(file);
    return;
  }

  const tablesArg = flagValue(args, '--tables');
  console.log('Backing up:');
  const result = await dump({
    tables: tablesArg && !tablesArg.startsWith('--') ? tablesArg.split(',').map((t) => t.trim()) : undefined,
    schemaOnly: args.includes('--schema-only'),
  });

  console.log(`\nWrote ${result.file} (${result.tables} tables, ${result.rows} rows).`);
  await verify(result.file);
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
