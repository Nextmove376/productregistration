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
