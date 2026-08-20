/**
 * Regression tests for the backup encoder and verifier.
 *
 * These matter more than most tests in this repo, because the failure they guard
 * against is silent and only discovered on the worst possible day. A dump that
 * mis-escapes one value still *looks* like a backup — right size, right table list,
 * opens fine in an editor — and only reveals itself when a restore fails halfway
 * through, having already dropped the tables it was supposed to be protecting.
 *
 *   npx tsx --test scripts/test-backup.ts
 *
 * Nothing here touches a database. `dumpToString` needs a live connection, but every
 * property that can corrupt a dump lives in the pure functions it composes, so those
 * are what get pinned.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Before any `lib/` import: `lib/backup` reaches `lib/db`, which throws at module load
// without credentials. No query is ever issued from these tests.
import './test-env';

import {
  TERMINATOR,
  backupFilename,
  literal,
  quote,
  splitStatements,
  verifySql,
} from '../lib/backup';

/* ------------------------------------------------------------------ *
 * quote
 * ------------------------------------------------------------------ */

test('quote wraps in single quotes', () => {
  assert.equal(quote('hello'), "'hello'");
});

test('quote escapes a single quote, so a value cannot end its own statement', () => {
  // The classic corruption: an apostrophe in "Dubai's" closing the string early and
  // turning the rest of the row into stray SQL.
  assert.equal(quote("Dubai's"), "'Dubai\\'s'");
});

test('quote escapes backslash before quote, not after', () => {
  // Order is load-bearing. If quotes were escaped first, the backslash pass would then
  // double the escape character and re-expose the quote.
  assert.equal(quote('a\\b'), "'a\\\\b'");
  assert.equal(quote("a\\'b"), "'a\\\\\\'b'");
});

test('quote escapes newlines and tabs rather than emitting them raw', () => {
  // Raw newlines inside a literal survive MySQL but break line-oriented importers and
  // make the verify regexes (which are ^-anchored per line) unreliable.
  assert.equal(quote('a\nb'), "'a\\nb'");
  assert.equal(quote('a\r\nb'), "'a\\r\\nb'");
  assert.equal(quote('a\tb'), "'a\\tb'");
});

test('quote escapes NUL and 0x1A', () => {
  assert.equal(quote('a\0b'), "'a\\0b'");
  // 0x1A is EOF to some Windows-side importers: a post containing it would silently
  // truncate the restore at that byte.
  assert.equal(quote('a\x1ab'), "'a\\Zb'");
});

/* ------------------------------------------------------------------ *
 * literal
 * ------------------------------------------------------------------ */

test('literal renders null and undefined as SQL NULL', () => {
  assert.equal(literal(null), 'NULL');
  assert.equal(literal(undefined), 'NULL');
});

test('literal renders a Date as UTC without the T or Z', () => {
  const d = new Date('2026-08-20T09:14:02.118Z');
  assert.equal(literal(d), "'2026-08-20 09:14:02'");
});

test('literal renders non-finite numbers as NULL, never NaN', () => {
  // `NaN` and `Infinity` are not SQL literals; emitting them produces a dump that
  // fails to import at exactly one row and takes the rest of the restore with it.
  assert.equal(literal(NaN), 'NULL');
  assert.equal(literal(Infinity), 'NULL');
  assert.equal(literal(-Infinity), 'NULL');
  assert.equal(literal(0), '0');
  assert.equal(literal(-1.5), '-1.5');
});

test('literal renders booleans as 1 and 0 for TINYINT columns', () => {
  assert.equal(literal(true), '1');
  assert.equal(literal(false), '0');
});

test('literal hex-encodes Buffers', () => {
  assert.equal(literal(Buffer.from([0x00, 0xff, 0x10])), '0x00ff10');
});

test('literal JSON-encodes objects and escapes the result', () => {
  // `services.body` is a JSON column full of quotes; the JSON must be escaped as a
  // string, not spliced in raw. Double quotes need no escaping inside a single-quoted
  // literal, so only the apostrophe is touched.
  assert.equal(literal({ a: "it's" }), `'{"a":"it\\'s"}'`);
});

/* ------------------------------------------------------------------ *
 * verifySql
 * ------------------------------------------------------------------ */

/** A minimal dump shaped exactly like the real one. */
function fakeDump(tables: string[], terminated = true): string {
  const head = [
    '-- Logical backup of this database',
    '-- Created: 2026-08-20T09:14:02.118Z',
    `-- Tables: ${tables.length}`,
    '',
    'SET NAMES utf8mb4;',
    '',
  ];
  const body = tables.flatMap((t) => [
    `DROP TABLE IF EXISTS \`${t}\`;`,
    `CREATE TABLE \`${t}\` (id INT);`,
    '',
    `INSERT INTO \`${t}\` (\`id\`) VALUES`,
    '(1);',
    '',
  ]);
  return [...head, ...body, ...(terminated ? [TERMINATOR, ''] : [])].join('\n');
}

test('verifySql accepts a complete dump', () => {
  const r = verifySql(fakeDump(['posts', 'media']));
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.creates, ['posts', 'media']);
  assert.equal(r.tablesClaimed, 2);
  assert.equal(r.insertBatches, 2);
  assert.equal(r.terminated, true);
});

test('verifySql rejects a truncated dump', () => {
  // The whole point of the check. A dump cut short by an OOM kill, a dropped
  // connection, or a full disk is indistinguishable from a good one by eye.
  const r = verifySql(fakeDump(['posts'], false));
  assert.equal(r.ok, false);
  assert.equal(r.terminated, false);
  assert.match(r.problems.join(' '), /truncated/);
});

test('verifySql rejects a dump whose header disagrees with its contents', () => {
  const sql = fakeDump(['posts', 'media']).replace('-- Tables: 2', '-- Tables: 5');
  const r = verifySql(sql);
  assert.equal(r.ok, false);
  assert.match(r.problems.join(' '), /claims 5 tables but 2/);
});

test('verifySql rejects an empty file', () => {
  const r = verifySql('');
  assert.equal(r.ok, false);
  assert.equal(r.creates.length, 0);
});

test('verifySql reads the created timestamp back', () => {
  assert.equal(verifySql(fakeDump(['posts'])).created, '2026-08-20T09:14:02.118Z');
});

/* ------------------------------------------------------------------ *
 * splitStatements
 * ------------------------------------------------------------------ */

test('splitStatements splits on statement boundaries', () => {
  assert.deepEqual(splitStatements('SELECT 1; SELECT 2;'), ['SELECT 1', 'SELECT 2']);
});

test('splitStatements does not split on a semicolon inside a string literal', () => {
  // The reason `split(';')` is not good enough: post content and JSON service bodies
  // are full of semicolons, and every one of them would shear a statement in half.
  const sql = `INSERT INTO \`posts\` (\`content\`) VALUES ('<p>a; b</p>');`;
  assert.deepEqual(splitStatements(sql), [
    "INSERT INTO `posts` (`content`) VALUES ('<p>a; b</p>')",
  ]);
});

test('splitStatements respects an escaped quote inside a string', () => {
  // `\'` must not be read as the end of the literal, or everything after it — including
  // the real terminator — is parsed in the wrong state.
  const sql = `INSERT INTO \`t\` VALUES ('Dubai\\'s; law'); SELECT 2;`;
  assert.deepEqual(splitStatements(sql), [
    "INSERT INTO `t` VALUES ('Dubai\\'s; law')",
    'SELECT 2',
  ]);
});

test('splitStatements respects backtick identifiers containing a semicolon', () => {
  const sql = 'SELECT `we;ird` FROM t; SELECT 2;';
  assert.deepEqual(splitStatements(sql), ['SELECT `we;ird` FROM t', 'SELECT 2']);
});

test('splitStatements drops comment-only fragments', () => {
  // The dump is heavily commented. Sending a bare comment block as a statement makes
  // MySQL reject it and aborts a restore that had nothing wrong with it.
  const sql = ['-- a comment', '-- another', 'SELECT 1;', '-- trailing note'].join('\n');
  assert.deepEqual(splitStatements(sql), ['-- a comment\n-- another\nSELECT 1']);
});

/* ------------------------------------------------------------------ *
 * The two halves together
 * ------------------------------------------------------------------ */

test('a value full of hostile characters survives quote then splitStatements intact', () => {
  // This is the invariant that actually matters: the encoder and the restore splitter
  // must agree. Either one alone can be self-consistent and still lose data.
  const nasty = `It's a "test"; \\ end\nnew line\ttab \x1a`;
  const sql = `INSERT INTO \`posts\` (\`content\`) VALUES (${literal(nasty)});`;

  const statements = splitStatements(sql);
  assert.equal(statements.length, 1, 'the value must not be split into two statements');
  assert.ok(statements[0].startsWith('INSERT INTO `posts`'));

  // And the encoded form must contain no raw newline or bare semicolon-ending quote.
  assert.ok(!literal(nasty).includes('\n'), 'no raw newline may reach the file');
});

/* ------------------------------------------------------------------ *
 * Filenames
 * ------------------------------------------------------------------ */

test('backupFilename is safe for a filesystem and a Content-Disposition header', () => {
  const name = backupFilename();
  assert.match(name, /^db-\d{4}-\d{2}-\d{2}T[\d-]+Z\.sql$/);
  // A colon is illegal in a Windows filename and a quote would break the header.
  for (const bad of [':', '"', '\\', '/']) {
    assert.ok(!name.includes(bad), `filename must not contain ${bad}`);
  }
});
