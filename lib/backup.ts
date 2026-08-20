/**
 * Logical database backup — the reusable core.
 *
 * This used to live entirely inside `scripts/backup-db.ts`, which meant a backup
 * required a shell. The deployment this ships to (Hostinger shared hosting) has
 * phpMyAdmin and nothing else, so "create a backup first" was a step that could not
 * actually be taken by the person who needed to take it.
 *
 * So the dump logic lives here, importable from two places:
 *   - `scripts/backup-db.ts` — the CLI, for a machine with a terminal.
 *   - `app/api/admin/backup/route.ts` — a button in the admin panel that streams
 *     the same SQL to the browser as a download.
 *
 * **Why not `mysqldump`.** The MySQL client binaries are frequently absent from the
 * app container and the database is reached over the network. A backup that depends
 * on a binary the host may not have is a backup strategy that fails exactly when it
 * is needed. This reads through the same `mysql2` pool the app already uses: if the
 * app can reach the database, so can the backup.
 *
 * The output is plain SQL that phpMyAdmin will import, because phpMyAdmin is the one
 * database tool this deployment reliably has.
 *
 * **Restore is deliberately not here.** It stays in the CLI script. Exposing a
 * `DROP TABLE`-and-recreate over HTTP — behind a session cookie, one click from a
 * mis-aimed button — is not a risk worth the convenience. Reading data out is safe;
 * writing it back over live rows is not.
 */

import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from './db';

type Runner = Pool | PoolConnection;

/** Rows per INSERT statement. Large enough to be fast, small enough for phpMyAdmin. */
const ROWS_PER_INSERT = 200;

/** The line every complete dump ends with. Absence of it means truncation. */
export const TERMINATOR = 'SET FOREIGN_KEY_CHECKS = 1;';

/**
 * Ceiling on a single dump, in bytes.
 *
 * The HTTP path builds the whole dump in memory before sending it, and this runs in a
 * shared-hosting container with a small heap. Failing with a clear message beats an
 * OOM kill that takes the live site down with it.
 */
export const DEFAULT_MAX_BYTES = 48 * 1024 * 1024;

/* ------------------------------------------------------------------ *
 * Value encoding
 * ------------------------------------------------------------------ */

/**
 * One value as a SQL literal.
 *
 * Hand-rolled rather than using `pool.escape` for `Date` and `Buffer`, because the
 * output has to survive a round trip through phpMyAdmin's importer, which is stricter
 * than the wire protocol about datetime formatting and binary literals.
 */
export function literal(value: unknown): string {
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
 * Escapes backslash and quote, plus the control characters that would otherwise end
 * the statement early. `\Z` is escaped because a literal 0x1A in a file makes some
 * Windows-side importers treat it as end-of-file.
 */
export function quote(s: string): string {
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

export async function listTables(db: Runner = pool): Promise<string[]> {
  const [rows] = await db.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`
  );
  return (rows as { TABLE_NAME: string }[]).map((r) => r.TABLE_NAME);
}

async function createStatement(table: string, db: Runner): Promise<string> {
  const [rows] = await db.query(`SHOW CREATE TABLE \`${table}\``);
  const row = (rows as Record<string, string>[])[0];
  // The column is named 'Create Table' for tables and 'Create View' for views.
  return row['Create Table'] ?? row['Create View'] ?? '';
}

export async function rowCount(table: string, db: Runner = pool): Promise<number> {
  const [rows] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}

/* ------------------------------------------------------------------ *
 * Dump
 * ------------------------------------------------------------------ */

export interface DumpOptions {
  /** Restrict to these tables (case-insensitive). Omit for the whole database. */
  tables?: string[];
  /** Structure only, no rows. */
  schemaOnly?: boolean;
  /** Abort rather than exceed this many bytes. Defaults to {@link DEFAULT_MAX_BYTES}. */
  maxBytes?: number;
  /** Called once per table, for CLI progress output. */
  onProgress?: (table: string, detail: string) => void;
}

export interface DumpResult {
  sql: string;
  /** Tables actually included, in dump order. */
  tables: string[];
  /** Total data rows written across every INSERT. */
  rows: number;
  bytes: number;
}

/**
 * Builds a full logical dump as a string.
 *
 * Rows are read in pages so a large table is never pulled into memory in one go, and
 * ordered by primary key where there is one so two dumps of unchanged data are
 * byte-identical — which is what makes the verify step meaningful.
 */
export async function dumpToString(
  options: DumpOptions = {},
  db: Runner = pool
): Promise<DumpResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const all = await listTables(db);

  const tables = options.tables?.length
    ? all.filter((t) => options.tables!.some((w) => w.toLowerCase() === t.toLowerCase()))
    : all;

  const missing = (options.tables ?? []).filter(
    (w) => !all.some((t) => t.toLowerCase() === w.toLowerCase())
  );
  if (missing.length) {
    throw new Error(`No such table(s): ${missing.join(', ')}. Present: ${all.join(', ')}`);
  }

  const parts: string[] = [];
  let bytes = 0;
  let totalRows = 0;

  /** Appends and enforces the ceiling, so an oversized dump fails early and clearly. */
  const push = (...lines: string[]) => {
    for (const line of lines) bytes += line.length + 1;
    if (bytes > maxBytes) {
      throw new Error(
        `Backup exceeded ${(maxBytes / 1024 / 1024).toFixed(0)} MB and was stopped before ` +
          `running the server out of memory. Back up in parts instead — one table at a ` +
          `time — or run the CLI, which streams to disk.`
      );
    }
    parts.push(...lines);
  };

  push(
    `-- Logical backup of this database`,
    `-- Created: ${new Date().toISOString()}`,
    `-- Tables: ${tables.length}${options.schemaOnly ? ' (schema only)' : ''}`,
    `--`,
    `-- Restore by importing this file in phpMyAdmin, or:`,
    `--   npx tsx scripts/backup-db.ts --restore <this file> --yes`,
    ``,
    // utf8mb4 throughout: the mojibake this project had to repair came from a charset
    // mismatch, and a backup that re-introduces one is worse than no backup.
    `SET NAMES utf8mb4;`,
    `SET FOREIGN_KEY_CHECKS = 0;`,
    `SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';`,
    ``
  );

  for (const table of tables) {
    const count = options.schemaOnly ? 0 : await rowCount(table, db);
    options.onProgress?.(table, options.schemaOnly ? 'schema' : `${count} rows`);

    push(
      `-- ------------------------------------------------------------`,
      `-- ${table}`,
      `-- ------------------------------------------------------------`,
      `DROP TABLE IF EXISTS \`${table}\`;`,
      `${await createStatement(table, db)};`,
      ``
    );

    if (options.schemaOnly || count === 0) {
      push('');
      continue;
    }

    const [columnRows] = await db.query(
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
      const [pageRows] = await db.query(
        `SELECT ${columnList} FROM \`${table}\`${order} LIMIT ${ROWS_PER_INSERT} OFFSET ${offset}`
      );
      const values = (pageRows as Record<string, unknown>[]).map(
        (row) => `(${names.map((n) => literal(row[n])).join(', ')})`
      );
      if (values.length === 0) break;
      push(`INSERT INTO \`${table}\` (${columnList}) VALUES`, `${values.join(',\n')};`, ``);
      totalRows += values.length;
    }
  }

  push(TERMINATOR, ``);

  const sql = parts.join('\n');
  return { sql, tables, rows: totalRows, bytes: sql.length };
}

/* ------------------------------------------------------------------ *
 * Verify
 * ------------------------------------------------------------------ */

export interface VerifyResult {
  ok: boolean;
  problems: string[];
  created: string | null;
  tablesClaimed: number;
  creates: string[];
  insertBatches: number;
  terminated: boolean;
  bytes: number;
}

/**
 * Checks a dump is intact, without touching the database.
 *
 * "Verify a backup" has to mean more than "the file exists" — a truncated dump looks
 * perfectly fine right up until the day it is needed. This confirms the file ends
 * where it should and that every table it claims to contain really has a CREATE
 * statement, which is what a half-written or memory-capped dump loses first.
 */
export function verifySql(sql: string): VerifyResult {
  const tablesClaimed = Number(/^-- Tables: (\d+)/m.exec(sql)?.[1] ?? '0');
  const creates = [...sql.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map((m) => m[1]);
  const insertBatches = [...sql.matchAll(/^INSERT INTO `([^`]+)`/gm)].length;
  const terminated = sql.trimEnd().endsWith(TERMINATOR);

  const problems: string[] = [];
  if (!terminated) problems.push('the file does not end with its terminator, so it is truncated');
  if (tablesClaimed !== creates.length) {
    problems.push(
      `header claims ${tablesClaimed} tables but ${creates.length} CREATE statements are present`
    );
  }
  if (creates.length === 0) problems.push('no CREATE TABLE statements at all');

  return {
    ok: problems.length === 0,
    problems,
    created: /^-- Created: (.+)$/m.exec(sql)?.[1] ?? null,
    tablesClaimed,
    creates,
    insertBatches,
    terminated,
    bytes: sql.length,
  };
}

/* ------------------------------------------------------------------ *
 * Statement splitting (restore path — CLI only)
 * ------------------------------------------------------------------ */

/**
 * Splits a dump into statements.
 *
 * A naive `split(';')` breaks on semicolons inside string literals, of which this
 * schema has many — JSON service bodies and HTML post content are full of them. This
 * tracks quote state and escapes instead.
 */
export function splitStatements(sql: string): string[] {
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

/** `db-2026-08-20T09-14-02-118Z.sql` — filesystem- and Content-Disposition-safe. */
export function backupFilename(prefix = 'db'): string {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
}
