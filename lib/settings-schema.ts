import {
  isNumericType,
  isTemporalType,
  isTextType,
  tableColumnMeta,
  type ColumnMeta,
} from './schema';

/**
 * Reconciles this codebase's idea of the `settings` table with the one that is actually
 * deployed.
 *
 * The live table was created by a system older than this project. It does not have the
 * `key`/`value` columns the code selects, and — the part that caused real damage — it
 * carries a **string PRIMARY KEY column under a name this codebase has never used**.
 *
 * That produced two distinct failures from one cause:
 *
 *  1. Every `SELECT \`key\`, \`value\` FROM settings` failed with errno 1054, was
 *     swallowed, and returned the in-process defaults. Settings looked populated and
 *     were never actually read.
 *  2. Once `key` was added and saving started working, each INSERT still omitted the
 *     legacy primary key. MySQL substituted `''`, so the first row inserted fine and
 *     the second collided:
 *     `ER_DUP_ENTRY Duplicate entry '' for key 'PRIMARY'`.
 *
 * Hardcoding the legacy name was the wrong fix — I guessed five candidates and the real
 * one was none of them. So nothing here is hardcoded: the primary key is discovered from
 * `information_schema`, whatever it is called, and both the read and the write path are
 * built from what the table reports.
 */

/** Names an older schema might have used, tried only after the primary key. */
const KEY_ALIASES = ['setting_key', 'option_name', 'meta_key', 'name', 'skey', 'setting'];
const VALUE_ALIASES = ['setting_value', 'option_value', 'meta_value', 'val', 'content'];

export interface SettingsShape {
  /** The column holding the setting name. `null` when the table is unreadable. */
  keyColumn: string | null;
  valueColumn: string | null;
  /** The `type` ENUM, when this deployment has one. */
  typeColumn: string | null;
  /**
   * A string primary key that is *not* `keyColumn` — the legacy column behind the
   * duplicate-entry crash. Every INSERT must supply it, and it must be unique per row.
   */
  legacyKeyColumn: string | null;
  /**
   * Columns that are `NOT NULL` with no default and no auto-increment, excluding the
   * ones above. An INSERT that omits these relies on MySQL's implicit default, which is
   * `''`/`0` — fine once, a primary-key or unique collision the second time.
   */
  requiredColumns: ColumnMeta[];
  /** False when the table does not exist or could not be introspected. */
  usable: boolean;
}

function pick(meta: Map<string, ColumnMeta>, preferred: string, aliases: string[]): string | null {
  if (meta.has(preferred)) return meta.get(preferred)!.name;
  for (const alias of aliases) {
    if (meta.has(alias)) return meta.get(alias)!.name;
  }
  return null;
}

export async function resolveSettingsShape(): Promise<SettingsShape> {
  return deriveSettingsShape(await tableColumnMeta('settings'));
}

/**
 * The whole resolution rule, as a pure function of the table's metadata.
 *
 * Split out from the async wrapper so the regression tests can reproduce the exact live
 * table — including its unguessable legacy primary key — without a database. The bug this
 * guards against was only ever visible against production data.
 */
export function deriveSettingsShape(meta: Map<string, ColumnMeta>): SettingsShape {
  if (meta.size === 0) {
    return {
      keyColumn: null,
      valueColumn: null,
      typeColumn: null,
      legacyKeyColumn: null,
      requiredColumns: [],
      usable: false,
    };
  }

  // A text primary key is how settings tables are conventionally shaped, so if `key` is
  // absent the primary key is the best guess at where the names live — better than any
  // alias list, because it is read from the table itself.
  const textPrimaryKeys = [...meta.values()].filter(
    (c) => c.primaryKey && isTextType(c.dataType) && !c.autoIncrement
  );

  const keyColumn =
    meta.get('key')?.name ?? textPrimaryKeys[0]?.name ?? pick(meta, 'key', KEY_ALIASES);

  const valueColumn = pick(meta, 'value', VALUE_ALIASES);
  const typeColumn = meta.get('type')?.name ?? null;

  const legacyKeyColumn =
    textPrimaryKeys.find((c) => c.name.toLowerCase() !== keyColumn?.toLowerCase())?.name ?? null;

  const claimed = new Set(
    [keyColumn, valueColumn, typeColumn, legacyKeyColumn]
      .filter((c): c is string => Boolean(c))
      .map((c) => c.toLowerCase())
  );

  const requiredColumns = [...meta.values()].filter(
    (c) =>
      !claimed.has(c.name.toLowerCase()) &&
      !c.autoIncrement &&
      !c.hasDefault &&
      (!c.nullable || c.primaryKey)
  );

  return {
    keyColumn,
    valueColumn,
    typeColumn,
    legacyKeyColumn,
    requiredColumns,
    usable: Boolean(keyColumn && valueColumn),
  };
}

/**
 * A value that will not collide, for a column the code has no opinion about.
 *
 * Primary-key members get the setting name so each row differs. Everything else gets the
 * type's own zero value — the point is only to stop MySQL choosing `''` for a column
 * that participates in a unique constraint.
 */
export function fillerValue(column: ColumnMeta, key: string): string | number | Date {
  if (column.primaryKey && isTextType(column.dataType)) return key;
  if (isNumericType(column.dataType)) return 0;
  if (isTemporalType(column.dataType)) return new Date();
  if (column.primaryKey) return key;
  return '';
}

/**
 * Statements that reconcile the legacy primary key with `key`, in both directions.
 *
 * Run before writing. Idempotent, non-destructive, and it repairs the row that the
 * duplicate-entry bug already left behind with an empty primary key.
 *
 *  - **Rescue:** the legacy column holds names this codebase never read. Copy them into
 *    `key` so those settings become visible instead of stranded.
 *  - **Forward-fill:** rows written by the broken INSERT have `key` set and the legacy
 *    primary key empty. Copy `key` across so the primary key is unique again and the
 *    next INSERT has nothing to collide with.
 *
 * Neither statement overwrites a column that already has a value, so re-running is safe.
 */
export function reconcileStatements(shape: SettingsShape): string[] {
  const { keyColumn, legacyKeyColumn } = shape;
  if (!keyColumn || !legacyKeyColumn) return [];

  const k = `\`${keyColumn}\``;
  const l = `\`${legacyKeyColumn}\``;

  return [
    `UPDATE \`settings\` SET ${k} = ${l}
       WHERE (${k} IS NULL OR ${k} = '') AND ${l} IS NOT NULL AND ${l} <> ''`,
    `UPDATE \`settings\` SET ${l} = ${k}
       WHERE (${l} IS NULL OR ${l} = '') AND ${k} IS NOT NULL AND ${k} <> ''`,
  ];
}

export interface SettingsStatements {
  /** Columns the INSERT supplies, in parameter order. */
  insertColumns: string[];
  insertSql: string;
  updateSql: string;
}

/**
 * The INSERT and UPDATE for one settings row, built from the discovered shape.
 *
 * Lives here rather than in the route so the regression tests can assert the exact SQL
 * that production runs. The property that matters, and the one the tests pin down, is
 * that **every column the table requires appears in the INSERT** — the duplicate-entry
 * crash was an INSERT that left the primary key out and let MySQL default it to `''`.
 */
export function buildSettingsStatements(shape: SettingsShape): SettingsStatements {
  if (!shape.keyColumn || !shape.valueColumn) {
    throw new Error('buildSettingsStatements requires a resolved key and value column');
  }

  const insertColumns = [shape.keyColumn, shape.valueColumn];
  if (shape.typeColumn) insertColumns.push(shape.typeColumn);
  if (shape.legacyKeyColumn) insertColumns.push(shape.legacyKeyColumn);
  for (const column of shape.requiredColumns) insertColumns.push(column.name);

  const insertSql =
    `INSERT INTO \`settings\` (${insertColumns.map((c) => `\`${c}\``).join(', ')}) ` +
    `VALUES (${insertColumns.map(() => '?').join(', ')})`;

  // The legacy key is only ever filled in when blank — never overwritten, because on a row
  // that predates this codebase it is the row's real identity.
  const updateSql =
    `UPDATE \`settings\` SET \`${shape.valueColumn}\` = ?` +
    (shape.typeColumn ? `, \`${shape.typeColumn}\` = ?` : '') +
    (shape.legacyKeyColumn
      ? `, \`${shape.legacyKeyColumn}\` = IF(\`${shape.legacyKeyColumn}\` IS NULL OR \`${shape.legacyKeyColumn}\` = '', ?, \`${shape.legacyKeyColumn}\`)`
      : '') +
    ` WHERE \`${shape.keyColumn}\` = ?`;

  return { insertColumns, insertSql, updateSql };
}

/**
 * Parameters for one row, matching `insertColumns` order exactly.
 *
 * Shared with the tests so a future change that adds a column to the statement but
 * forgets its parameter fails a test instead of throwing errno 1136 in production.
 */
export type SettingsParam = string | number | Date | null;

export function insertParams(
  shape: SettingsShape,
  key: string,
  value: string,
  columnType: string | null
): SettingsParam[] {
  const params: SettingsParam[] = [key, value];
  if (shape.typeColumn) params.push(columnType);
  if (shape.legacyKeyColumn) params.push(key);
  for (const column of shape.requiredColumns) params.push(fillerValue(column, key));
  return params;
}

export function updateParams(
  shape: SettingsShape,
  key: string,
  value: string,
  columnType: string | null
): SettingsParam[] {
  const params: SettingsParam[] = [value];
  if (shape.typeColumn) params.push(columnType);
  if (shape.legacyKeyColumn) params.push(key);
  params.push(key);
  return params;
}
