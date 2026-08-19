import { join, resolve, sep } from 'path';

/**
 * The one place that decides where uploaded files live on disk.
 *
 * ## The bug this exists to fix
 *
 * Every consumer used to compute `join(process.cwd(), 'uploads')` independently.
 * That looks right and is wrong in production, because this app is built with
 * `output: 'standalone'` and the `server.js` Next generates for standalone builds
 * does `process.chdir(__dirname)` before booting (see
 * `node_modules/next/dist/build/utils.js`). So in production `process.cwd()` is
 * not the project root — it is `<project>/.next/standalone`.
 *
 * The consequence was silent and total:
 *
 *  - Uploads were written to `<project>/.next/standalone/uploads`, and because the
 *    upload route `mkdir`s that directory, uploading appeared to work.
 *  - `.next/` is build output. Every deploy and every rebuild wipes it.
 *  - So every uploaded image survived only until the next build, and then every
 *    `<img src="/api/media/...">` on the site and in the admin panel broke at once.
 *  - Meanwhile the `uploads/` directory at the project root — the one deliberately
 *    kept out of git so it would survive deploys — was never read from or written
 *    to at all.
 *
 * ## The rule
 *
 * Uploads are user data. They must never resolve to a path inside `.next/`.
 *
 * `UPLOAD_DIR_OVERRIDE` (env) wins, so the directory can be moved outside the
 * project entirely — which is the right answer on a host where the deploy replaces
 * the whole application directory. Otherwise we resolve the real project root by
 * detecting the standalone layout and climbing out of it.
 */

/**
 * The project root, as opposed to whatever directory the process happens to be
 * running from.
 *
 * `.next/standalone` is the only case that needs unwinding: `next start` and
 * `next dev` both leave `cwd` at the project root already.
 *
 * Pure and exported so the standalone case can be tested without chdir-ing a real
 * process into a real build directory.
 */
export function projectRootFrom(cwd: string): string {
  const resolved = resolve(cwd);
  const standaloneSuffix = sep + join('.next', 'standalone');

  if (resolved.endsWith(standaloneSuffix)) {
    // <project>/.next/standalone -> <project>
    return resolve(resolved, '..', '..');
  }

  return resolved;
}

/** Pure form of the export below, so the resolution rules can be asserted directly. */
export function resolveUploadDir(cwd: string, override?: string | null): string {
  const trimmed = override?.trim();
  if (trimmed) return resolve(trimmed);
  return join(projectRootFrom(cwd), 'uploads');
}

/** Absolute path to the uploads directory. Resolved once, at module load. */
export const UPLOAD_DIR: string = resolveUploadDir(
  process.cwd(),
  process.env.UPLOAD_DIR_OVERRIDE,
);

/** Where generated thumbnails go. Kept here so it cannot drift from `UPLOAD_DIR`. */
export const THUMBNAIL_DIR: string = join(UPLOAD_DIR, 'thumbnails');
