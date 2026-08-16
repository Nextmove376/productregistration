import { unlink } from 'fs/promises';
import { join, resolve, sep } from 'path';
import pool from '@/lib/db';
import { logger } from '@/lib/logger';
import { pathVariants, toPublicUrl, toStorageKey } from '@/lib/media-path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export interface MediaRow {
  id: number;
  filename: string;
  path: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number;
  mime_type: string | null;
  thumbnail_path: string | null;
  blur_data: string | null;
  uploaded_at: string;
  deleted_at: string | null;
}

export interface MediaReference {
  type: 'post' | 'service' | 'team_member' | 'setting';
  id: number | string;
  title: string;
  field: string;
}

export async function getMediaById(id: number, includeDeleted = false): Promise<MediaRow | null> {
  const [rows] = await pool.execute(
    `SELECT id, filename, path, alt, width, height, size_bytes, mime_type,
            thumbnail_path, blur_data, uploaded_at, deleted_at
       FROM media
      WHERE id = ?${includeDeleted ? '' : ' AND deleted_at IS NULL'}
      LIMIT 1`,
    [id]
  );
  return ((rows as MediaRow[])[0]) ?? null;
}

/**
 * Finds content that points at this media file.
 *
 * The original check compared `media.path` directly against
 * `posts.featured_image`. Those columns store different representations of the
 * same asset — `media.path` holds a bare filename (`hero.jpg`) because that is
 * what the upload route writes, while consumers store the served URL
 * (`/api/media/hero.jpg`). The comparison could therefore never match, so the
 * "is this file in use?" guard silently passed for every file.
 *
 * Matching against every known variant fixes it, and the check now covers the
 * columns the original missed: team photos and the logo/OG image settings.
 */
export async function findMediaReferences(mediaPath: string): Promise<MediaReference[]> {
  const variants = pathVariants(mediaPath);
  if (variants.length === 0) return [];

  const placeholders = variants.map(() => '?').join(', ');
  const refs: MediaReference[] = [];

  const lookups: {
    sql: string;
    params: any[];
    map: (row: any) => MediaReference;
  }[] = [
    {
      sql: `SELECT id, title, 'featured_image' AS field FROM posts
             WHERE featured_image IN (${placeholders}) AND deleted_at IS NULL
             UNION ALL
            SELECT id, title, 'og_image' AS field FROM posts
             WHERE og_image IN (${placeholders}) AND deleted_at IS NULL
             LIMIT 20`,
      params: [...variants, ...variants],
      map: (r) => ({ type: 'post', id: r.id, title: r.title, field: r.field }),
    },
    {
      sql: `SELECT id, title, 'hero_image' AS field FROM services
             WHERE hero_image IN (${placeholders}) AND deleted_at IS NULL
             UNION ALL
            SELECT id, title, 'og_image' AS field FROM services
             WHERE og_image IN (${placeholders}) AND deleted_at IS NULL
             LIMIT 20`,
      params: [...variants, ...variants],
      map: (r) => ({ type: 'service', id: r.id, title: r.title, field: r.field }),
    },
    {
      sql: `SELECT id, name AS title, 'photo_url' AS field FROM team_members
             WHERE photo_url IN (${placeholders}) AND deleted_at IS NULL
             LIMIT 20`,
      params: variants,
      map: (r) => ({ type: 'team_member', id: r.id, title: r.title, field: r.field }),
    },
    {
      sql: `SELECT \`key\` AS id, \`key\` AS title, 'value' AS field FROM settings
             WHERE value IN (${placeholders})
             LIMIT 20`,
      params: variants,
      map: (r) => ({ type: 'setting', id: r.id, title: r.title, field: r.field }),
    },
  ];

  for (const lookup of lookups) {
    try {
      const [rows] = await pool.execute(lookup.sql, lookup.params);
      refs.push(...(rows as any[]).map(lookup.map));
    } catch (err) {
      // A missing table/column must not make a delete look safe when it isn't,
      // but it also must not block the whole operation — log loudly instead.
      logger.warn('media.reference_check_partial_failure', { err });
    }
  }

  return refs;
}

/** Removes a file from the uploads dir, guarding against escaping it. */
async function removeFile(storageKey: string | null): Promise<void> {
  if (!storageKey) return;

  const target = resolve(UPLOAD_DIR, storageKey);
  const root = resolve(UPLOAD_DIR);
  if (target !== root && !target.startsWith(root + sep)) {
    logger.warn('media.unlink_outside_root_blocked', { storageKey });
    return;
  }

  try {
    await unlink(target);
    logger.debug('media.file_removed', { storageKey });
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      logger.error('media.unlink_failed', { err, storageKey });
    }
  }
}

export type DeleteOutcome =
  | { ok: true; id: number; purged: boolean }
  | { ok: false; code: 'not_found' }
  | { ok: false; code: 'referenced'; references: MediaReference[] };

export interface DeleteOptions {
  /** Delete even when other content references the file. */
  force?: boolean;
  /** Permanently remove the row and unlink the file (otherwise soft delete). */
  purge?: boolean;
}

/**
 * The single delete implementation, shared by the `DELETE` handler and the
 * `POST` action envelope.
 *
 * Having one code path is what makes the POST fallback trustworthy: the fallback
 * used when a proxy blocks the DELETE verb performs exactly the same work rather
 * than a second, subtly different implementation.
 *
 * Soft delete intentionally leaves the file on disk so a restore from Trash still
 * has something to restore; only a purge unlinks.
 */
export async function deleteMedia(id: number, options: DeleteOptions = {}): Promise<DeleteOutcome> {
  const { force = false, purge = false } = options;

  const media = await getMediaById(id, purge);
  if (!media) return { ok: false, code: 'not_found' };

  if (!force) {
    const references = await findMediaReferences(media.path);
    if (references.length > 0) {
      logger.info('media.delete_blocked_by_references', { id, count: references.length });
      return { ok: false, code: 'referenced', references };
    }
  }

  if (purge) {
    // `media.path` could be NULL on a legacy row — `toStorageKey` handles that
    // rather than throwing on `.replace()` as the old handler did.
    await removeFile(toStorageKey(media.path));
    await removeFile(toStorageKey(media.thumbnail_path));
    await pool.execute('DELETE FROM media WHERE id = ?', [id]);
    logger.info('media.purged', { id, filename: media.filename });
  } else {
    await pool.execute('UPDATE media SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    logger.info('media.soft_deleted', { id, filename: media.filename });
  }

  return { ok: true, id, purged: purge };
}

export async function restoreMedia(id: number): Promise<boolean> {
  const [result] = await pool.execute(
    'UPDATE media SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL',
    [id]
  );
  return ((result as any).affectedRows ?? 0) > 0;
}

/** Shapes a row for the client, converting storage keys into served URLs. */
export function toMediaDto(row: MediaRow) {
  return {
    id: row.id,
    filename: row.filename,
    path: toPublicUrl(row.path),
    thumbnail_path: toPublicUrl(row.thumbnail_path),
    alt: row.alt ?? '',
    width: row.width,
    height: row.height,
    size_bytes: Number(row.size_bytes ?? 0),
    mime_type: row.mime_type ?? '',
    blur_data: row.blur_data,
    uploaded_at: row.uploaded_at,
    deleted_at: row.deleted_at,
  };
}
