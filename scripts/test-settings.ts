/**
 * Regression tests for the settings write path.
 *
 * These exist because of one production incident:
 * `ER_DUP_ENTRY Duplicate entry '' for key 'PRIMARY'` on every second settings save.
 *
 * The live `settings` table carries a string PRIMARY KEY under a name this codebase had
 * never used. Every INSERT omitted it, MySQL substituted `''`, the first row saved, and the
 * second collided with it. I guessed five candidate names before accepting that the name
 * cannot be guessed — it has to be read from `information_schema`.
 *
 * So the property under test is not "the SQL looks right", it is:
 *
 *   **every column the table requires appears in the INSERT, with a distinct value per row.**
 *
 * `deriveSettingsShape` and `buildSettingsStatements` are pure functions of the table's
 * metadata precisely so this can be verified against a reproduction of the production
 * table, with no database and no deploy.
 *
 * Run with `npm test`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Must come before any `lib/` import: the pool asserts its env vars at module load.
// Import order is evaluation order, so this side-effect module runs first.
import './test-env';

import {
  buildSettingsStatements,
  deriveSettingsShape,
  insertParams,
  reconcileStatements,
  updateParams,
} from '../lib/settings-schema';
import type { ColumnMeta } from '../lib/schema';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

function col(name: string, dataType: string, opts: Partial<ColumnMeta> = {}): ColumnMeta {
  return {
    name,
    dataType,
    nullable: opts.nullable ?? true,
    hasDefault: opts.hasDefault ?? true,
    autoIncrement: opts.autoIncrement ?? false,
    primaryKey: opts.primaryKey ?? false,
  };
}

/** Keyed lowercase, exactly as `tableColumnMeta()` returns it. */
function metaOf(...columns: ColumnMeta[]): Map<string, ColumnMeta> {
  return new Map(columns.map((c) => [c.name.toLowerCase(), c]));
}

/**
 * The production table, as far as it can be reconstructed: a string primary key under a
 * name the code never used, alongside the modern columns a repair added later.
 */
const PRODUCTION = metaOf(
  col('config_name', 'varchar', { primaryKey: true, nullable: false, hasDefault: false }),
  col('key', 'varchar'),
  col('value', 'text'),
  col('type', 'enum'),
  col('updated_at', 'datetime')
);

/** What `scripts/migrate.ts` creates on a clean database. */
const MODERN = metaOf(
  col('key', 'varchar', { primaryKey: true, nullable: false, hasDefault: false }),
  col('value', 'text'),
  col('type', 'enum'),
  col('updated_at', 'timestamp')
);

/* ------------------------------------------------------------------ *
 * The incident
 * ------------------------------------------------------------------ */

test('discovers a legacy string primary key under a name the code never used', () => {
  const shape = deriveSettingsShape(PRODUCTION);

  assert.equal(shape.keyColumn, 'key');
  assert.equal(shape.valueColumn, 'value');
  assert.equal(shape.typeColumn, 'type');
  assert.equal(shape.legacyKeyColumn, 'config_name');
  assert.equal(shape.usable, true);
});

test('the INSERT supplies the legacy primary key — the omission that caused ER_DUP_ENTRY', () => {
  const shape = deriveSettingsShape(PRODUCTION);
  const { insertColumns, insertSql } = buildSettingsStatements(shape);

  assert.ok(
    insertColumns.includes('config_name'),
    'the legacy primary key must be written explicitly; omitting it lets MySQL default it to \'\''
  );
  assert.match(insertSql, /`config_name`/);
});

test('two different settings get two different primary keys', () => {
  // The whole bug in one assertion: with the primary key omitted both rows arrived as `''`,
  // so the first INSERT succeeded and the second raised
  // `ER_DUP_ENTRY Duplicate entry '' for key 'PRIMARY'`.
  const shape = deriveSettingsShape(PRODUCTION);
  const { insertColumns } = buildSettingsStatements(shape);
  const pkIndex = insertColumns.indexOf('config_name');

  const first = insertParams(shape, 'site_name', 'HyzenPro', 'text');
  const second = insertParams(shape, 'meta_title', 'Product Registration', 'text');

  assert.notEqual(first[pkIndex], second[pkIndex]);
  assert.equal(first[pkIndex], 'site_name');
  assert.equal(second[pkIndex], 'meta_title');
  assert.notEqual(first[pkIndex], '');
  assert.notEqual(second[pkIndex], '');
});

test('every NOT NULL column with no default is written explicitly', () => {
  // Same failure mode, different column: an omitted NOT NULL column is either errno 1364 or
  // a silent implicit default, and an implicit `''` in a unique key collides on row two.
  const shape = deriveSettingsShape(
    metaOf(
      col('config_name', 'varchar', { primaryKey: true, nullable: false, hasDefault: false }),
      col('key', 'varchar'),
      col('value', 'text'),
      col('group_name', 'varchar', { nullable: false, hasDefault: false }),
      col('position', 'int', { nullable: false, hasDefault: false })
    )
  );

  const required = shape.requiredColumns.map((c) => c.name);
  assert.deepEqual(required.sort(), ['group_name', 'position']);

  const { insertColumns } = buildSettingsStatements(shape);
  for (const name of required) {
    assert.ok(insertColumns.includes(name), `${name} is NOT NULL with no default and must be in the INSERT`);
  }

  // Typed zero values, so nothing lands in a unique key as a duplicate blank.
  const params = insertParams(shape, 'site_name', 'HyzenPro', 'text');
  assert.equal(params[insertColumns.indexOf('group_name')], '');
  assert.equal(params[insertColumns.indexOf('position')], 0);
});

test('parameter count matches placeholder count', () => {
  // Guards the next change: adding a column to the statement but not to the parameter list
  // is errno 1136, and it would only ever appear in production.
  for (const meta of [PRODUCTION, MODERN]) {
    const shape = deriveSettingsShape(meta);
    const { insertColumns, insertSql, updateSql } = buildSettingsStatements(shape);

    const insertPlaceholders = (insertSql.match(/\?/g) ?? []).length;
    assert.equal(insertPlaceholders, insertColumns.length);
    assert.equal(insertParams(shape, 'site_name', 'x', 'text').length, insertColumns.length);

    const updatePlaceholders = (updateSql.match(/\?/g) ?? []).length;
    assert.equal(updateParams(shape, 'site_name', 'x', 'text').length, updatePlaceholders);
  }
});

/* ------------------------------------------------------------------ *
 * The shapes that must keep working
 * ------------------------------------------------------------------ */

test('a clean database needs no legacy handling', () => {
  const shape = deriveSettingsShape(MODERN);

  assert.equal(shape.keyColumn, 'key');
  assert.equal(shape.legacyKeyColumn, null, '`key` is the primary key, so there is no second one');
  assert.deepEqual(shape.requiredColumns, []);

  const { insertColumns } = buildSettingsStatements(shape);
  assert.deepEqual(insertColumns, ['key', 'value', 'type']);
  assert.deepEqual(reconcileStatements(shape), [], 'nothing to reconcile');
});

test('falls back to the primary key when there is no `key` column at all', () => {
  // The state the live table was in before the repair ran: errno 1072 when indexing `key`,
  // and every `SELECT \`key\`, \`value\`` failing with errno 1054 and being swallowed.
  const shape = deriveSettingsShape(
    metaOf(
      col('config_name', 'varchar', { primaryKey: true, nullable: false, hasDefault: false }),
      col('setting_value', 'text')
    )
  );

  assert.equal(shape.keyColumn, 'config_name');
  assert.equal(shape.valueColumn, 'setting_value');
  assert.equal(shape.legacyKeyColumn, null, 'the only text primary key is now the key column itself');
  assert.equal(shape.usable, true);
});

test('recognises conventional alias names', () => {
  const shape = deriveSettingsShape(
    metaOf(
      col('id', 'int', { primaryKey: true, autoIncrement: true, nullable: false, hasDefault: false }),
      col('option_name', 'varchar', { nullable: false, hasDefault: false }),
      col('option_value', 'longtext')
    )
  );

  assert.equal(shape.keyColumn, 'option_name');
  assert.equal(shape.valueColumn, 'option_value');
  assert.equal(shape.typeColumn, null);
});

test('an auto-increment primary key is never treated as a key column or filled in', () => {
  const shape = deriveSettingsShape(
    metaOf(
      col('id', 'int', { primaryKey: true, autoIncrement: true, nullable: false, hasDefault: false }),
      col('key', 'varchar', { nullable: false, hasDefault: false }),
      col('value', 'text')
    )
  );

  assert.equal(shape.keyColumn, 'key');
  assert.equal(shape.legacyKeyColumn, null);
  assert.deepEqual(shape.requiredColumns.map((c) => c.name), [], 'MySQL supplies the id itself');
  assert.deepEqual(buildSettingsStatements(shape).insertColumns, ['key', 'value']);
});

test('an unreadable table reports itself unusable instead of writing wrong SQL', () => {
  const shape = deriveSettingsShape(new Map());

  assert.equal(shape.usable, false);
  assert.equal(shape.keyColumn, null);
  assert.throws(() => buildSettingsStatements(shape), /requires a resolved key and value column/);
});

/* ------------------------------------------------------------------ *
 * Data repair
 * ------------------------------------------------------------------ */

test('reconcile copies names in both directions and overwrites nothing', () => {
  const statements = reconcileStatements(deriveSettingsShape(PRODUCTION));
  assert.equal(statements.length, 2);

  const [rescue, forwardFill] = statements;

  // Rescue: settings stranded under the old name become readable.
  assert.match(rescue, /SET `key` = `config_name`/);
  // Forward-fill: rows the bug wrote with an empty primary key get a unique one.
  assert.match(forwardFill, /SET `config_name` = `key`/);

  // Both are guarded on the target being empty, which is what makes them idempotent and
  // non-destructive — they can run on every save without ever losing a value.
  for (const sql of statements) {
    assert.match(sql, /IS NULL OR/);
    assert.ok(!/SET `\w+` = `\w+`\s+WHERE\s*$/.test(sql), 'must not be an unguarded UPDATE');
  }
});

test('reconcile is a no-op when there is no legacy column to reconcile', () => {
  assert.deepEqual(reconcileStatements(deriveSettingsShape(MODERN)), []);
  assert.deepEqual(reconcileStatements(deriveSettingsShape(new Map())), []);
});

test('the update never blanks the legacy primary key', () => {
  // Overwriting it unconditionally would destroy the identity of rows that predate this
  // codebase, so the UPDATE only fills it when it is already empty.
  const shape = deriveSettingsShape(PRODUCTION);
  const { updateSql } = buildSettingsStatements(shape);

  assert.match(
    updateSql,
    /`config_name` = IF\(`config_name` IS NULL OR `config_name` = '', \?, `config_name`\)/
  );
  assert.match(updateSql, /WHERE `key` = \?$/);
});
