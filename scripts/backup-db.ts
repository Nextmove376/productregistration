/**
 * Logical database backup and restore — command line.
 *
 * The dump logic itself lives in `lib/backup.ts`, so the admin panel can offer the
 * same backup as a one-click download on a host with no shell. This file is the CLI
 * around it, plus restore — which is deliberately *only* here.
 *
 *   npx tsx scripts/backup-db.ts                      # full backup to backups/
 *   npx tsx scripts/backup-db.ts --tables settings,services
 *   npx tsx scripts/backup-db.ts --schema-only
 *   npx tsx scripts/backup-db.ts --verify backups/db-<stamp>.sql
 *   npx tsx scripts/backup-db.ts --restore backups/db-<stamp>.sql --yes
 *
 * **Restore is deliberately awkward.** It requires `--yes`, refuses to run from a
 * truncated dump, takes a fresh safety backup of whatever it is about to replace, and
 * prints the row counts it will destroy first. Restores happen on bad days; the
 * friction is the point.
 */

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pool from '../lib/db';
import {
  TERMINATOR,
  backupFilename,
  dumpToString,
  listTables,
  rowCount,
  splitStatements,
  verifySql,
  type DumpOptions,
} from '../lib/backup';

const ROOT = path.resolve(import.meta.dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups');

/* ------------------------------------------------------------------ *
 * Dump to disk
 * ------------------------------------------------------------------ */

async function dumpToFile(
  options: DumpOptions = {}
): Promise<{ file: string; tables: number; rows: number }> {
  await mkdir(BACKUP_DIR, { recursive: true });
  const target = path.join(BACKUP_DIR, backupFilename());

  const result = await dumpToString({
    ...options,
    // The CLI writes to disk, so the in-memory ceiling that protects the shared-hosting
    // container is not the relevant limit here. Keep it generous but present.
    maxBytes: options.maxBytes ?? 512 * 1024 * 1024,
    onProgress: (table, detail) => process.stdout.write(`  ${table} (${detail})\n`),
  });

  await writeFile(target, result.sql, 'utf8');
  return { file: path.relative(ROOT, target), tables: result.tables.length, rows: result.rows };
}

/* ------------------------------------------------------------------ *
 * Verify
 * ------------------------------------------------------------------ */

async function verifyFile(file: string): Promise<void> {
  const target = path.resolve(ROOT, file);
  const info = await stat(target);
  const report = verifySql(await readFile(target, 'utf8'));

  console.log(`\n${file}`);
  console.log(`  size            ${(info.size / 1024).toFixed(1)} KB`);
  console.log(`  created         ${report.created ?? 'unknown'}`);
  console.log(`  tables claimed  ${report.tablesClaimed}`);
  console.log(`  CREATE TABLE    ${report.creates.length}`);
  console.log(`  INSERT batches  ${report.insertBatches}`);
  console.log(`  complete        ${report.terminated ? 'yes' : 'NO - file is truncated'}`);

  if (!report.ok) {
    console.error(`\nBackup is NOT usable:`);
    for (const p of report.problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nBackup looks intact. Tables: ${report.creates.join(', ')}`);
}

/* ------------------------------------------------------------------ *
 * Restore
 * ------------------------------------------------------------------ */

async function restore(file: string, confirmed: boolean): Promise<void> {
  const target = path.resolve(ROOT, file);
  const sql = await readFile(target, 'utf8');

  if (!sql.trimEnd().endsWith(TERMINATOR)) {
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

  // A restore that overwrites the only copy of the current state is not a recovery,
  // it is a second incident.
  console.log(`\nBacking up current state first...`);
  const safety = await dumpToFile({ tables: willReplace.filter((t) => existing.includes(t)) });
  console.log(`Safety backup: ${safety.file}`);

  const conn = await pool.getConnection();
  let applied = 0;
  try {
    for (const statement of splitStatements(sql)) {
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
    await verifyFile(file);
    return;
  }

  const tablesArg = flagValue(args, '--tables');
  console.log('Backing up:');
  const result = await dumpToFile({
    tables: tablesArg && !tablesArg.startsWith('--') ? tablesArg.split(',').map((t) => t.trim()) : undefined,
    schemaOnly: args.includes('--schema-only'),
  });

  console.log(`\nWrote ${result.file} (${result.tables} tables, ${result.rows} rows).`);
  await verifyFile(result.file);
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
