/**
 * Mojibake repair for database rows — the reusable core.
 *
 * Extracted from `scripts/fix-mojibake.ts` so the same scan and the same repair can be
 * run from the admin panel, not only from a terminal. See `lib/backup.ts` for the same
 * reasoning: on this host the terminal is the one tool the operator does not have.
 *
 * Two functions, deliberately separate:
 *
 *   `scanDatabaseMojibake()`   reads only. Safe to run at any time, on live data.
 *   `repairDatabaseMojibake()` writes, in one transaction, from a scan's findings.
 *
 * They are separate because the honest way to offer this over HTTP is "show me what you
 * would change, then let me approve it". A single `fix everything` button on live
 * content is how a bad regex silently rewrites every post in the database.
 *
 * The column list is not hardcoded. It asks `information_schema` which columns hold
 * text and what each table's primary key is. That is deliberate: this project has
 * already lost a day to code that assumed it knew the shape of the `settings` table and
 * was wrong about the name of its primary key.
 *
 * See `lib/mojibake.ts` for why the corruption is exactly invertible.
 */

import pool from './db';
import { fixMojibake } from './mojibake';

/** One corrupted value, addressed precisely enough to update exactly that row. */
export interface RowFinding {
  table: string;
  pkColumn: string;
  pkValue: string | number;
  column: string;
  before: string;
  after: string;
}

export interface ScanResult {
  findings: RowFinding[];
  /** Tables that could not be checked, with the reason. Reported, never silently dropped. */
  skipped: string[];
  /** Tables that were read, whether or not anything was found. */
  scanned: string[];
}

const TEXT_TYPES = ['char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext'];

/**
 * Finds every text value in the database that decodes to something different.
 *
 * Read-only. A finding is only recorded when `fixMojibake` actually changes the value,
 * so clean rows cost nothing and are never touched.
 */
export async function scanDatabaseMojibake(): Promise<ScanResult> {
  const [columnRows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_KEY, DATA_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION`
  );

  const tables = new Map<string, { text: string[]; keys: string[] }>();
  for (const row of columnRows as {
    TABLE_NAME: string;
    COLUMN_NAME: string;
    COLUMN_KEY: string;
    DATA_TYPE: string;
  }[]) {
    const entry = tables.get(row.TABLE_NAME) ?? { text: [], keys: [] };
    if (TEXT_TYPES.includes(row.DATA_TYPE.toLowerCase())) entry.text.push(row.COLUMN_NAME);
    if (row.COLUMN_KEY === 'PRI') entry.keys.push(row.COLUMN_NAME);
    tables.set(row.TABLE_NAME, entry);
  }

  const findings: RowFinding[] = [];
  const skipped: string[] = [];
  const scanned: string[] = [];

  for (const [table, { text, keys }] of tables) {
    if (text.length === 0) continue;
    // A composite or absent primary key gives no safe way to address one row.
    if (keys.length !== 1) {
      skipped.push(`${table} (${keys.length === 0 ? 'no primary key' : 'composite primary key'})`);
      continue;
    }
    const pk = keys[0];
    const columnList = [pk, ...text.filter((c) => c !== pk)].map((c) => `\`${c}\``).join(', ');

    const [rows] = await pool.query(`SELECT ${columnList} FROM \`${table}\``);
    scanned.push(table);

    for (const row of rows as Record<string, unknown>[]) {
      for (const column of text) {
        const before = row[column];
        if (typeof before !== 'string' || !before) continue;
        const after = fixMojibake(before);
        if (after === before) continue;
        findings.push({
          table,
          pkColumn: pk,
          pkValue: row[pk] as string | number,
          column,
          before,
          after,
        });
      }
    }
  }

  return { findings, skipped, scanned };
}

/**
 * Applies a scan's findings, all or nothing.
 *
 * One transaction, because a half-repaired database is harder to reason about than a
 * fully corrupted one: you no longer know which rows have been touched. Each update is
 * addressed by primary key and writes only the one column, so a row that changed
 * between the scan and the repair loses nothing else.
 */
export async function repairDatabaseMojibake(findings: RowFinding[]): Promise<number> {
  if (findings.length === 0) return 0;

  const conn = await pool.getConnection();
  let updated = 0;
  try {
    await conn.beginTransaction();
    for (const f of findings) {
      await conn.execute(
        `UPDATE \`${f.table}\` SET \`${f.column}\` = ? WHERE \`${f.pkColumn}\` = ?`,
        [f.after, f.pkValue]
      );
      updated++;
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
  return updated;
}

/**
 * A short preview of one finding, safe to show in a UI or log.
 *
 * Truncated hard: some of these columns hold entire post bodies, and the corrupted run
 * is what matters, not the surrounding paragraph.
 */
export function previewFinding(f: RowFinding, width = 60): string {
  // Start the window at the first difference, which is where the mojibake is.
  let at = 0;
  while (at < f.before.length && f.before[at] === f.after[at]) at++;
  const from = Math.max(0, at - 12);
  const clip = (s: string) =>
    (from > 0 ? '…' : '') + s.slice(from, from + width) + (from + width < s.length ? '…' : '');
  return `${f.table}.${f.column} #${f.pkValue}: ${clip(f.before)} → ${clip(f.after)}`;
}
