/**
 * Canonical media path handling.
 *
 * The bug this exists to fix: `media.path` stores a bare filename
 * (`my-image.jpg`) because that is what the upload route writes, but consumers
 * store the served URL (`/api/media/my-image.jpg`) in `posts.featured_image`,
 * `services.hero_image`, etc. The reference check before deleting media compared
 * the two forms directly, so it could never match and never blocked a delete.
 *
 * Rule: the **storage key** (bare, relative to the uploads dir) is canonical in
 * the `media` table. Convert at the boundary with these helpers.
 */

export const MEDIA_URL_PREFIX = '/api/media/';

/** `my-image.jpg` -> `/api/media/my-image.jpg` (idempotent). */
export function toPublicUrl(pathOrUrl: string | null | undefined): string | null {
  const key = toStorageKey(pathOrUrl);
  if (!key) return null;
  return MEDIA_URL_PREFIX + key;
}

/** `/api/media/my-image.jpg` -> `my-image.jpg` (idempotent). */
export function toStorageKey(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;

  let value = String(pathOrUrl).trim();
  if (!value) return null;

  // Tolerate absolute URLs that may have been pasted in by an editor.
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      /* fall through and treat as a path */
    }
  }

  if (value.startsWith(MEDIA_URL_PREFIX)) value = value.slice(MEDIA_URL_PREFIX.length);
  // Legacy rows written before uploads moved out of public/.
  else if (value.startsWith('/uploads/')) value = value.slice('/uploads/'.length);
  else if (value.startsWith('uploads/')) value = value.slice('uploads/'.length);

  value = value.replace(/^\/+/, '');
  return value || null;
}

/**
 * Both representations of one asset, for `WHERE col IN (?, ?)` reference checks
 * against columns that may hold either form.
 */
export function pathVariants(pathOrUrl: string | null | undefined): string[] {
  const key = toStorageKey(pathOrUrl);
  if (!key) return [];
  return [key, MEDIA_URL_PREFIX + key, `/uploads/${key}`];
}
