/**
 * Regression tests for the post-revision field lists and counters.
 *
 * The severe failure mode here is silent and permanent: a snapshot that omits a column
 * loses that column's history, and a restore that writes back the wrong set either
 * fails to recover content or clobbers something it had no business touching. Nothing
 * in the type system objects to either, and by the time anyone notices, the version
 * that could have proved it went wrong has already been overwritten.
 *
 * So the invariants are pinned here rather than trusted:
 *
 *   npx tsx --test scripts/test-revisions.ts
 *
 * These call the same exported helpers the SQL in `lib/revisions.ts` uses — a test
 * that re-implemented the field list would only prove the test agrees with itself.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Before any `lib/` import: `lib/revisions` reaches `lib/db`, which throws at module
// load without credentials. No query is ever issued from these tests.
import './test-env';

import {
  DEFAULT_KEEP,
  NEVER_RESTORE,
  SNAPSHOT_COLUMNS,
  nextRevisionNumber,
  restoreColumns,
  revisionsToPrune,
} from '../lib/revisions';

const snapshot = SNAPSHOT_COLUMNS as readonly string[];

/* ------------------------------------------------------------------ *
 * The two field lists must describe the same set of columns
 * ------------------------------------------------------------------ */

test('the restore list is exactly the snapshot list minus the protected columns', () => {
  const restore = restoreColumns();
  const blocked = new Set<string>(NEVER_RESTORE as readonly string[]);

  // Nothing may be restored that was never snapshotted — that column would be written
  // from `undefined` and blank out live content.
  for (const column of restore) {
    assert.ok(snapshot.includes(column), `${column} is restored but never snapshotted`);
  }

  // And nothing snapshotted may be quietly skipped on the way back: a column captured
  // for months that restore ignores is history that cannot actually be recovered.
  for (const column of snapshot) {
    assert.equal(
      restore.includes(column),
      !blocked.has(column),
      `${column} is out of sync between the snapshot and restore lists`
    );
  }

  assert.equal(restore.length, snapshot.length - snapshot.filter((c) => blocked.has(c)).length);
});

test('content is snapshotted and restorable — the whole point of the feature', () => {
  assert.ok(snapshot.includes('content'));
  assert.ok(restoreColumns().includes('content'));
});

test('id, views, created_at and deleted_at are never written back', () => {
  const restore = new Set(restoreColumns());

  for (const column of ['id', 'views', 'created_at', 'deleted_at']) {
    assert.ok(!restore.has(column), `${column} must never be restored onto a post`);
  }
});

test('the protected columns are filtered, not merely absent by luck', () => {
  // Simulates a future edit that adds one of them to the snapshot list: the filter has
  // to hold the line on its own, without a second edit somewhere else.
  const leaky = [...snapshot, 'id', 'views', 'created_at', 'deleted_at'];
  assert.deepEqual(restoreColumns(leaky), restoreColumns());
});

/* ------------------------------------------------------------------ *
 * Revision numbering
 * ------------------------------------------------------------------ */

test('a post with no revisions yet derives revision_number 1', () => {
  // `COALESCE(MAX(revision_number), 0)` on an empty set.
  assert.equal(nextRevisionNumber(0), 1);
  // A driver that hands back NULL, or no row at all.
  assert.equal(nextRevisionNumber(null), 1);
  assert.equal(nextRevisionNumber(undefined), 1);
});

test('numbering continues from the highest existing revision', () => {
  assert.equal(nextRevisionNumber(1), 2);
  assert.equal(nextRevisionNumber(29), 30);
  // Pruning deletes the oldest rows but never lowers MAX, so numbers stay monotonic
  // and cannot collide with one the unique key has already seen.
  assert.equal(nextRevisionNumber(120), 121);
});

test('a nonsense maximum still yields a usable positive number', () => {
  assert.equal(nextRevisionNumber(Number.NaN), 1);
  assert.equal(nextRevisionNumber(-5), 1);
});

/* ------------------------------------------------------------------ *
 * Pruning
 * ------------------------------------------------------------------ */

test('prune keeps exactly N and drops the oldest rows', () => {
  // 35 ids, newest first, as the ORDER BY revision_number DESC query returns them.
  const newestFirst = Array.from({ length: 35 }, (_, i) => 100 - i);

  const dropped = revisionsToPrune(newestFirst, 30);

  assert.equal(dropped.length, 5);
  assert.deepEqual(dropped, [70, 69, 68, 67, 66], 'the five oldest, and only those');

  const kept = newestFirst.filter((id) => !dropped.includes(id));
  assert.equal(kept.length, 30, 'exactly N survive');
  assert.equal(kept[0], 100, 'the newest is never a candidate');
});

test('prune does nothing while a post is under the limit', () => {
  assert.deepEqual(revisionsToPrune([3, 2, 1], 30), []);
  // Exactly at the limit is still nothing to do — the off-by-one that would silently
  // eat the oldest revision of every post.
  assert.deepEqual(revisionsToPrune([3, 2, 1], 3), []);
});

test('the default keep matches DEFAULT_KEEP', () => {
  const newestFirst = Array.from({ length: DEFAULT_KEEP + 2 }, (_, i) => 1000 - i);
  assert.deepEqual(revisionsToPrune(newestFirst), revisionsToPrune(newestFirst, DEFAULT_KEEP));
  assert.equal(revisionsToPrune(newestFirst).length, 2);
});

test('a zero or nonsense keep clears the history instead of guessing', () => {
  assert.deepEqual(revisionsToPrune([3, 2, 1], 0), [3, 2, 1]);
  assert.deepEqual(revisionsToPrune([3, 2, 1], -1), [3, 2, 1]);
  assert.deepEqual(revisionsToPrune([3, 2, 1], Number.NaN), [3, 2, 1]);
});
