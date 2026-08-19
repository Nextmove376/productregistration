import test from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve, sep } from 'path';
import { projectRootFrom, resolveUploadDir } from '../lib/upload-dir';

/**
 * Regression tests for the uploads path.
 *
 * These exist because getting this wrong broke every image on the site at once,
 * with no error anywhere: uploads resolved to `<project>/.next/standalone/uploads`
 * (Next's standalone `server.js` calls `process.chdir(__dirname)`), which is build
 * output, so every deploy silently deleted the entire media library.
 *
 * The property that matters is the last test: the resolved path must never be
 * inside `.next`.
 */

const PROJECT = resolve(sep === '\\' ? 'C:\\app\\site' : '/app/site');

test('resolves to <project>/uploads when cwd is the project root', () => {
  assert.equal(resolveUploadDir(PROJECT), join(PROJECT, 'uploads'));
});

test('climbs out of .next/standalone — the production case', () => {
  const standaloneCwd = join(PROJECT, '.next', 'standalone');
  assert.equal(projectRootFrom(standaloneCwd), PROJECT);
  assert.equal(resolveUploadDir(standaloneCwd), join(PROJECT, 'uploads'));
});

test('an override wins over cwd entirely', () => {
  const outside = resolve(sep === '\\' ? 'D:\\persistent\\media' : '/var/persistent/media');
  assert.equal(resolveUploadDir(PROJECT, outside), outside);
  assert.equal(resolveUploadDir(join(PROJECT, '.next', 'standalone'), outside), outside);
});

test('a blank or whitespace override is ignored, not treated as a path', () => {
  // An env var set to '' would otherwise resolve to the process cwd and put uploads
  // wherever the app happens to be launched from.
  assert.equal(resolveUploadDir(PROJECT, ''), join(PROJECT, 'uploads'));
  assert.equal(resolveUploadDir(PROJECT, '   '), join(PROJECT, 'uploads'));
  assert.equal(resolveUploadDir(PROJECT, null), join(PROJECT, 'uploads'));
  assert.equal(resolveUploadDir(PROJECT, undefined), join(PROJECT, 'uploads'));
});

test('a directory merely named .next-something is not mistaken for build output', () => {
  const cwd = join(PROJECT, '.next-custom', 'standalone');
  assert.equal(resolveUploadDir(cwd), join(cwd, 'uploads'));
});

test('the resolved path is never inside .next', () => {
  const candidates = [
    PROJECT,
    join(PROJECT, '.next', 'standalone'),
    join(PROJECT, 'nested', 'deeper'),
  ];

  for (const cwd of candidates) {
    const dir = resolveUploadDir(cwd);
    assert.ok(
      !dir.split(sep).includes('.next'),
      `uploads must not live inside build output, got ${dir} for cwd ${cwd}`,
    );
  }
});
