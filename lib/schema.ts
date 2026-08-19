import pool from './db';

/**
 * Runtime schema introspection, cached per process.
 *
 * The admin panel used to break outright when the live database was missing a
 * column the query named: MySQL answers `Unknown column 'x' in 'field list'`
 * (errno 1054) and the whole endpoint 500s. That is a very poor failure mode for a
 * CMS — one stale column takes down a screen that could have rendered nine tenths of
 * its data.
 *
 * So list queries now build their column list from the intersection of what they want
 * and what the table actually has, and only add `deleted_at IS NULL` when that column
 * exists. The panel degrades instead of dying, and `/admin/diagnostics` reports the
 * drift so it can be repaired for real.
 *
 * One `information_schema` query per table per process — negligible, and the result is
 * cached because a schema does not change under a running app (except via the repair
 * endpoint, which clears the cache itself).
 */

const cache = new Map<string, Promise<Set<string>>>();
const metaCache = new Map<string, Promise<Map<string, ColumnMeta>>>();

/**
 * What a column will accept, beyond merely existing.
 *
 * Knowing a column is *present* is not enough to write a row. `ER_DUP_ENTRY Duplicate
 * entry '' for key 'PRIMARY'` came from exactly that gap: the live `settings` table
 * carries a string PRIMARY KEY column this codebase never heard of, so every INSERT
 * omitted it, MySQL substituted `''`, and the second save of any session collided with
 * the first. An INSERT has to satisfy the table's real constraints, not the ones the
 * code assumes.
 */
export interface ColumnMeta {
  /** Real name, original case — use this when quoting into SQL. */
  name: string;
  nullable: boolean;
  /** False for `NOT NULL` with no `DEFAULT`: the value must be supplied explicitly. */
  hasDefault: boolean;
  autoIncrement: boolean;
  primaryKey: boolean;
  /** `varchar`, `int`, `datetime`, … as reported by `information_schema`. */
  dataType: string;
}

interface RawColumn {
  COLUMN_NAME: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  EXTRA: string | null;
  COLUMN_KEY: string | null;
  DATA_TYPE: string;
}

/**
 * Full column metadata for `table`, keyed by lowercased column name.
 *
 * Separate from `tableColumns` because most callers only need to know whether a column
 * exists, and this is the heavier query.
 */
export function tableColumnMeta(table: string): Promise<Map<string, ColumnMeta>> {
  const cached = metaCache.get(table);
  if (cached) return cached;

  const load = (async () => {
    try {
      const [rows] = await pool.execute(
        `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY, DATA_TYPE
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION`,
        [table]
      );
      const out = new Map<string, ColumnMeta>();
      for (const r of rows as RawColumn[]) {
        out.set(r.COLUMN_NAME.toLowerCase(), {
          name: r.COLUMN_NAME,
          nullable: r.IS_NULLABLE === 'YES',
          // A generated default (CURRENT_TIMESTAMP) reports as DEFAULT_GENERATED in EXTRA
          // while COLUMN_DEFAULT still carries the expression, so the null check covers it.
          hasDefault: r.COLUMN_DEFAULT !== null,
          autoIncrement: (r.EXTRA ?? '').toLowerCase().includes('auto_increment'),
          primaryKey: r.COLUMN_KEY === 'PRI',
          dataType: r.DATA_TYPE.toLowerCase(),
        });
      }
      return out;
    } catch {
      metaCache.delete(table);
      return new Map<string, ColumnMeta>();
    }
  })();

  metaCache.set(table, load);
  return load;
}

/** True for a type that holds text, so a key or a blank string is a valid value. */
export function isTextType(dataType: string): boolean {
  return /char|text|enum|set|blob|binary/.test(dataType);
}

export function isNumericType(dataType: string): boolean {
  return /int|decimal|numeric|float|double|bit|year/.test(dataType);
}

export function isTemporalType(dataType: string): boolean {
  return /date|time/.test(dataType);
}

/** Column names present on `table`, lowercased. Empty set if the table is missing. */
export function tableColumns(table: string): Promise<Set<string>> {
  const cached = cache.get(table);
  if (cached) return cached;

  const load = (async () => {
    try {
      const [rows] = await pool.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      return new Set((rows as { COLUMN_NAME: string }[]).map((r) => r.COLUMN_NAME.toLowerCase()));
    } catch {
      // If even introspection fails the database is unreachable; callers fall back
      // to their own error handling. Don't cache a failure.
      cache.delete(table);
      return new Set<string>();
    }
  })();

  cache.set(table, load);
  return load;
}

/** Forget everything — call after DDL so the next request sees the new shape. */
export function clearSchemaCache(): void {
  cache.clear();
  metaCache.clear();
}

export async function hasColumn(table: string, column: string): Promise<boolean> {
  return (await tableColumns(table)).has(column.toLowerCase());
}

/**
 * Narrows `wanted` to the columns that actually exist, returning a `SELECT` list.
 *
 * `alwaysKeep` names columns to emit regardless — used for `id`, which every table
 * has and which the client cannot work without.
 */
export async function selectList(table: string, wanted: string[], alwaysKeep: string[] = ['id']): Promise<string> {
  const present = await tableColumns(table);
  const keep = wanted.filter((c) => present.has(c.toLowerCase()) || alwaysKeep.includes(c));
  // A table we could not introspect returns nothing; `*` is the only safe answer
  // there, and the route shapes its own DTO from the row anyway.
  return keep.length > 0 ? keep.map((c) => `\`${c}\``).join(', ') : '*';
}

/**
 * `' AND alias.deleted_at IS NULL'` when the column exists, otherwise `''`.
 *
 * Written as a suffix so it can be appended to any `WHERE` clause that already has at
 * least one condition — pass `'1=1'` as the first condition when there is none.
 */
export async function softDeleteFilter(table: string, alias?: string): Promise<string> {
  if (!(await hasColumn(table, 'deleted_at'))) return '';
  return ` AND ${alias ? `${alias}.` : ''}deleted_at IS NULL`;
}

/** Column list narrowed to what exists, as an array (for INSERT/UPDATE builders). */
export async function presentColumns(table: string, wanted: string[]): Promise<string[]> {
  const present = await tableColumns(table);
  return wanted.filter((c) => present.has(c.toLowerCase()));
}
