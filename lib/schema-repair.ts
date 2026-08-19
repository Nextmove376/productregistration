import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from './db';
import { clearSchemaCache } from './schema';
import { reconcileStatements, resolveSettingsShape } from './settings-schema';
import {
  BACKFILL_SPEC,
  BASE_TABLES,
  COLUMN_SPEC,
  INDEX_SPEC,
  MODIFY_SPEC,
  UNIQUE_SPEC,
} from './schema-spec';

/**
 * Reconciles a live database against `lib/schema-spec.ts`.
 *
 * This exists because `CREATE TABLE IF NOT EXISTS` is a no-op on a table that already
 * exists — it does not add missing columns. The production database was created by an
 * older version of this project, so every column introduced since then was never
 * applied, and every admin query naming one of them failed with errno 1054.
 *
 * `inspect()` reports the drift without touching anything. `repair()` fixes it. Both
 * are safe to run repeatedly: each statement is guarded by an `information_schema`
 * lookup first, so nothing here can raise `#1060 Duplicate column name` or
 * `#1061 Duplicate key name` — the two errors that stopped the hand-run SQL halfway
 * through last time.
 */

type Runner = Pool | PoolConnection;

export interface SchemaReport {
  database: string;
  connected: boolean;
  /** Tables declared in the spec that do not exist at all. */
  missingTables: string[];
  /** `table.column` for every column the app needs and the database lacks. */
  missingColumns: string[];
  /** `table.index` for every index the app's queries want. */
  missingIndexes: string[];
  /** Row counts for the tables the admin panel reads, or -1 when unreadable. */
  rowCounts: Record<string, number>;
  /** Live probe of the queries that were failing, with the real driver message. */
  probes: { name: string; ok: boolean; error?: string }[];
  /**
   * Where uploaded files actually resolve to on this machine.
   *
   * Reported because the answer was wrong in production in a way nothing surfaced.
   * `output: 'standalone'` makes Next's generated `server.js` call
   * `process.chdir(__dirname)`, so `process.cwd()` is `<project>/.next/standalone` —
   * build output. Uploads landed there, worked until the next deploy wiped `.next/`,
   * and then every image on the site broke at once with nothing to point at.
   *
   * `insideBuildOutput` is the flag that matters: if it is ever true, uploads are
   * living on borrowed time regardless of what the file count says.
   */
  uploads?: {
    dir: string;
    cwd: string;
    exists: boolean;
    writable: boolean;
    fileCount: number;
    insideBuildOutput: boolean;
    error?: string;
  };
  /**
   * What the `settings` table really looks like, and which columns the code resolved to.
   *
   * Reported because two separate production failures came from this one table having a
   * shape nobody could see: no `key` column (errno 1072 when indexing it) and a string
   * primary key under an unguessable name (`ER_DUP_ENTRY Duplicate entry ''`). Printing
   * the actual column list turns the next surprise into a five-second diagnosis.
   */
  settings?: {
    columns: string[];
    keyColumn: string | null;
    valueColumn: string | null;
    typeColumn: string | null;
    legacyKeyColumn: string | null;
  };
  error?: string;
}

export interface RepairReport {
  applied: string[];
  failed: { statement: string; error: string }[];
}

/* ------------------------------------------------------------------ *
 * Introspection
 * ------------------------------------------------------------------ */

async function existingTables(db: Runner): Promise<Set<string>> {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  return new Set((rows as { TABLE_NAME: string }[]).map((r) => r.TABLE_NAME.toLowerCase()));
}

async function existingColumns(db: Runner): Promise<Map<string, Set<string>>> {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`
  );
  const map = new Map<string, Set<string>>();
  for (const r of rows as { TABLE_NAME: string; COLUMN_NAME: string }[]) {
    const table = r.TABLE_NAME.toLowerCase();
    if (!map.has(table)) map.set(table, new Set());
    map.get(table)!.add(r.COLUMN_NAME.toLowerCase());
  }
  return map;
}

async function existingIndexes(db: Runner): Promise<Set<string>> {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()`
  );
  return new Set(
    (rows as { TABLE_NAME: string; INDEX_NAME: string }[]).map(
      (r) => `${r.TABLE_NAME.toLowerCase()}.${r.INDEX_NAME.toLowerCase()}`
    )
  );
}

/** Table name from a `CREATE TABLE IF NOT EXISTS x (...)` statement. */
function tableNameOf(createSql: string): string {
  return createSql.match(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/i)?.[1].toLowerCase() ?? '';
}

function describe(err: unknown): string {
  const e = err as { code?: string; errno?: number; sqlMessage?: string; message?: string };
  const parts = [e?.sqlMessage || e?.message || String(err)];
  if (e?.code) parts.push(`(${e.code}${e.errno ? ` / ${e.errno}` : ''})`);
  return parts.join(' ');
}

/* ------------------------------------------------------------------ *
 * Inspect
 * ------------------------------------------------------------------ */

/** The queries that were failing in production, run for real so the panel can name the cause. */
const PROBES: { name: string; sql: string }[] = [
  { name: 'services list (admin)', sql: 'SELECT id, slug, title, tag, summary, icon, hero_image, sort_order, is_active, meta_title, meta_description, og_image, body, created_at, updated_at FROM services WHERE deleted_at IS NULL LIMIT 1' },
  { name: 'team list (admin)', sql: 'SELECT id, name, role, bio, linkedin, photo_url, phone, email, whatsapp, sort_order, is_active, created_at, updated_at FROM team_members WHERE deleted_at IS NULL LIMIT 1' },
  { name: 'analytics rollup', sql: 'SELECT date, path, country, views, visitors FROM daily_stats LIMIT 1' },
  { name: 'analytics dimensions', sql: 'SELECT device, browser, os, referrer_host, is_bot FROM pageviews LIMIT 1' },
  { name: 'settings upsert shape', sql: 'SELECT `key`, value, type, updated_at FROM settings LIMIT 1' },
  { name: 'posts list', sql: 'SELECT id, slug, title, status, published_at, views FROM posts WHERE deleted_at IS NULL LIMIT 1' },
  { name: 'media list', sql: 'SELECT id, filename, path, alt, mime_type, thumbnail_path, blur_data FROM media WHERE deleted_at IS NULL LIMIT 1' },
  { name: 'submissions list', sql: 'SELECT id, name, email, status, notes, mail_status FROM submissions WHERE deleted_at IS NULL LIMIT 1' },
  { name: 'session check', sql: 'SELECT id, email, role, is_active, session_version FROM admin_users LIMIT 1' },
  { name: 'audit log write shape', sql: 'SELECT action, entity, before_json, after_json, meta_json FROM audit_log LIMIT 1' },
];

const COUNTED_TABLES = ['services', 'posts', 'team_members', 'media', 'submissions', 'settings', 'admin_users', 'menus'];

/**
 * Where uploads resolve to, and whether that location survives a deploy.
 *
 * Never throws: a diagnostics page that 500s because it could not stat a directory
 * is worse than one that reports the directory is unreadable.
 */
async function inspectUploads(): Promise<NonNullable<SchemaReport['uploads']>> {
  const { UPLOAD_DIR } = await import('./upload-dir');
  const fs = await import('fs/promises');
  const path = await import('path');

  const result = {
    dir: UPLOAD_DIR,
    cwd: process.cwd(),
    exists: false,
    writable: false,
    fileCount: 0,
    // `.next` is regenerated by every build, so anything under it is temporary.
    insideBuildOutput: UPLOAD_DIR.split(path.sep).includes('.next'),
  } as NonNullable<SchemaReport['uploads']>;

  try {
    const stat = await fs.stat(UPLOAD_DIR);
    result.exists = stat.isDirectory();
  } catch {
    // Absent is a finding, not an error — and it is the common one, because the
    // upload route `mkdir`s this directory on demand. A missing directory here
    // almost always means a deploy deleted it, taking the media library with it.
    return result;
  }

  try {
    await fs.access(UPLOAD_DIR, (await import('fs')).constants.W_OK);
    result.writable = true;
  } catch {
    /* reported as writable: false */
  }

  try {
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
    result.fileCount = entries.filter((e) => e.isFile()).length;
  } catch (err) {
    result.error = describe(err);
  }

  return result;
}

export async function inspect(db: Runner = pool): Promise<SchemaReport> {
  const report: SchemaReport = {
    database: '',
    connected: false,
    missingTables: [],
    missingColumns: [],
    missingIndexes: [],
    rowCounts: {},
    probes: [],
  };

  try {
    const [dbRows] = await db.execute('SELECT DATABASE() AS db');
    report.database = ((dbRows as { db: string | null }[])[0]?.db) ?? '(none)';
    report.connected = true;
  } catch (err) {
    report.error = describe(err);
    return report;
  }

  const [tables, columns, indexes] = await Promise.all([
    existingTables(db),
    existingColumns(db),
    existingIndexes(db),
  ]);

  for (const sql of BASE_TABLES) {
    const table = tableNameOf(sql);
    if (table && !tables.has(table)) report.missingTables.push(table);
  }

  for (const [table, spec] of Object.entries(COLUMN_SPEC)) {
    if (!tables.has(table)) continue; // covered by missingTables
    const present = columns.get(table) ?? new Set<string>();
    for (const column of Object.keys(spec)) {
      if (!present.has(column.toLowerCase())) report.missingColumns.push(`${table}.${column}`);
    }
  }

  for (const [table, name] of [...INDEX_SPEC, ...UNIQUE_SPEC]) {
    if (!tables.has(table)) continue;
    if (!indexes.has(`${table}.${name.toLowerCase()}`)) report.missingIndexes.push(`${table}.${name}`);
  }

  // Row counts and probes run independently so one failure never hides the rest.
  await Promise.all([
    ...COUNTED_TABLES.map(async (table) => {
      if (!tables.has(table)) {
        report.rowCounts[table] = -1;
        return;
      }
      try {
        const [rows] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        report.rowCounts[table] = Number((rows as { n: number }[])[0]?.n ?? 0);
      } catch {
        report.rowCounts[table] = -1;
      }
    }),
    ...PROBES.map(async (probe) => {
      try {
        await db.query(probe.sql);
        report.probes.push({ name: probe.name, ok: true });
      } catch (err) {
        report.probes.push({ name: probe.name, ok: false, error: describe(err) });
      }
    }),
  ]);

  report.probes.sort((a, b) => Number(a.ok) - Number(b.ok));

  report.uploads = await inspectUploads();

  // The settings table has produced two production incidents on its own, both because
  // its real shape was invisible. Surface it directly instead of requiring a phpMyAdmin
  // round trip to find out.
  try {
    const shape = await resolveSettingsShape();
    const [rows] = await db.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings'
        ORDER BY ORDINAL_POSITION`
    );
    report.settings = {
      columns: (rows as { COLUMN_NAME: string }[]).map((r) => r.COLUMN_NAME),
      keyColumn: shape.keyColumn,
      valueColumn: shape.valueColumn,
      typeColumn: shape.typeColumn,
      legacyKeyColumn: shape.legacyKeyColumn,
    };
  } catch {
    // Non-fatal: the rest of the report is still useful.
  }

  return report;
}

/* ------------------------------------------------------------------ *
 * Repair
 * ------------------------------------------------------------------ */

/**
 * Brings the database up to spec: creates missing tables, adds missing columns,
 * re-applies type-sensitive definitions, then adds indexes and unique keys.
 *
 * Every statement is attempted individually and a failure is recorded rather than
 * thrown, so one impossible step (a unique key on a table that already holds
 * duplicates, say) cannot stop the rest — the opposite of pasting a script into
 * phpMyAdmin, which halts at the first error.
 */
export async function repair(db: Runner = pool): Promise<RepairReport> {
  const applied: string[] = [];
  const failed: { statement: string; error: string }[] = [];

  const run = async (label: string, sql: string) => {
    try {
      await db.query(sql);
      applied.push(label);
    } catch (err) {
      failed.push({ statement: label, error: describe(err) });
    }
  };

  // 1. Tables. `IF NOT EXISTS` makes this a no-op for anything already present.
  const before = await existingTables(db);
  for (const sql of BASE_TABLES) {
    const table = tableNameOf(sql);
    if (before.has(table)) continue;
    await run(`create table ${table}`, sql);
  }

  const tables = await existingTables(db);
  const columns = await existingColumns(db);

  // 2. Columns — the actual fix for the four broken admin screens.
  for (const [table, spec] of Object.entries(COLUMN_SPEC)) {
    if (!tables.has(table)) continue;
    const present = columns.get(table) ?? new Set<string>();
    for (const [column, definition] of Object.entries(spec)) {
      if (present.has(column.toLowerCase())) continue;
      await run(
        `${table}.${column}`,
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }

  const refreshed = await existingColumns(db);

  // 3. Rescue values that live under an older column name.
  //
  // The live `settings` table predates this codebase and had no `key` column at all —
  // indexing it failed with errno 1072, and every `SELECT \`key\`, \`value\` FROM settings`
  // had been failing silently and falling back to the in-process default cache. Step 2
  // just created the modern columns, so anything the old schema stored is still sitting
  // in its original column; copy it across rather than stranding it.
  //
  // Only one candidate per target can match, since the rest do not exist. Rows whose
  // target already has a value are left alone, so this is safe to re-run.
  for (const [table, target, sources] of BACKFILL_SPEC) {
    const present = refreshed.get(table);
    if (!present?.has(target.toLowerCase())) continue;
    for (const source of sources) {
      if (!present.has(source.toLowerCase())) continue;
      await run(
        `${table}.${target} <- ${source}`,
        `UPDATE \`${table}\` SET \`${target}\` = \`${source}\`
          WHERE (\`${target}\` IS NULL OR \`${target}\` = '') AND \`${source}\` IS NOT NULL`
      );
    }
  }

  // 3b. The same rescue for the one column the name list above could not guess.
  //
  // `BACKFILL_SPEC` is a list of plausible legacy names, and on this database none of
  // them matched — the real one only surfaced as
  // `ER_DUP_ENTRY Duplicate entry '' for key 'PRIMARY'` once saving started working.
  // So this step does not guess: it reads the table's actual string primary key from
  // `information_schema` and reconciles it with `key` in both directions, which both
  // exposes settings stranded under the old name and repairs the empty primary key the
  // duplicate-entry bug left behind.
  clearSchemaCache(); // step 2 changed the shape; the resolver must not read a stale cache
  const settingsShape = await resolveSettingsShape();
  for (const sql of reconcileStatements(settingsShape)) {
    await run(`settings.${settingsShape.legacyKeyColumn} <-> ${settingsShape.keyColumn}`, sql);
  }

  // 4. Types that must match what the app writes (short ENUMs, narrow VARCHARs).
  for (const [table, column, definition] of MODIFY_SPEC) {
    if (!refreshed.get(table)?.has(column.toLowerCase())) continue;
    await run(
      `${table}.${column} type`,
      `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`
    );
  }

  // 5. Indexes, then unique keys (which are the ones allowed to fail).
  const indexes = await existingIndexes(db);
  for (const [table, name, cols] of INDEX_SPEC) {
    if (!tables.has(table) || indexes.has(`${table}.${name.toLowerCase()}`)) continue;
    await run(`index ${table}.${name}`, `ALTER TABLE \`${table}\` ADD INDEX \`${name}\` (${cols})`);
  }
  for (const [table, name, cols] of UNIQUE_SPEC) {
    if (!tables.has(table) || indexes.has(`${table}.${name.toLowerCase()}`)) continue;
    // A pre-existing unique key on the same column makes this redundant, not wrong;
    // it lands in `failed` as errno 1061 and is harmless.
    await run(`unique ${table}.${name}`, `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${name}\` (${cols})`);
  }

  // 6. Anyone created before `is_active` existed must still be able to log in.
  if (refreshed.get('admin_users')?.has('is_active')) {
    await run('admin_users.is_active backfill', 'UPDATE admin_users SET is_active = 1 WHERE is_active IS NULL');
  }

  clearSchemaCache();
  return { applied, failed };
}

/* ------------------------------------------------------------------ *
 * Self-healing
 * ------------------------------------------------------------------ */

/**
 * MySQL errors that mean "the schema is not what the code expects", as opposed to
 * "your data is wrong". Only these trigger a repair.
 *
 * 1054 unknown column · 1146 table doesn't exist · 1091 can't drop/find ·
 * 1265 data truncated (an ENUM missing a member) · 1364 field has no default ·
 * 1176 named key doesn't exist
 */
const DRIFT_ERRNOS = new Set([1054, 1146, 1091, 1265, 1364, 1176]);

function isDrift(err: unknown): boolean {
  const e = err as { errno?: number; code?: string };
  if (e?.errno && DRIFT_ERRNOS.has(e.errno)) return true;
  return e?.code === 'ER_BAD_FIELD_ERROR' || e?.code === 'ER_NO_SUCH_TABLE';
}

/** One repair attempt per process — many concurrent requests share the same promise. */
let healing: Promise<RepairReport> | null = null;
let healed = false;

/**
 * Runs `work()`; if it fails because the live schema is behind the code, repairs the
 * schema once and runs it again.
 *
 * This is what turns "Could not load services" into a screen that simply works. The
 * production database was missing columns added months after it was created, and the
 * only way to find that out was to read the driver error by hand. Now the first
 * request that trips over the drift fixes it — the DDL is `information_schema`-guarded
 * and idempotent, so the worst case is a slightly slow request. It is attempted at most
 * once per process; a second failure is reported to the caller as normal.
 */
export async function withSchemaHeal<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (healed || !isDrift(err)) throw err;

    healing ??= repair(pool);
    const report = await healing;
    healed = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[schema] drift repaired automatically: ${report.applied.length} change(s)` +
        (report.failed.length ? `, ${report.failed.length} skipped` : '')
    );

    return work();
  }
}

/** Test/diagnostics hook: allow another automatic heal after a manual repair. */
export function resetHealState(): void {
  healing = null;
  healed = false;
}
