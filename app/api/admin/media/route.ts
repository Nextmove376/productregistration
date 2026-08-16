import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import pool from '@/lib/db';
import { checkCsrf, rateLimit, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/request-meta';
import { getPagination, getSearch, paginatedResponse } from '@/lib/query-params';
import { deleteMedia, restoreMedia, toMediaDto, type MediaRow } from '@/lib/media-service';
import { sanitizePlainText, sanitizeSvg } from '@/lib/sanitize';
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_REQUEST,
  validateMagicBytes,
  isVideoType,
} from '@/lib/media-validation';
import {
  badRequest,
  conflict,
  csrfFailed,
  invalidJson,
  notFound,
  ok,
  parseJsonBody,
  serverError,
  tooManyRequests,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

function generateSeoFilename(originalName: string, ext: string): string {
  const baseName = originalName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${baseName || 'file'}-${timestamp}-${random}.${ext}`;
}

async function getImageMetadata(buffer: Buffer, mimeType: string) {
  try {
    if (mimeType === 'image/svg+xml' || isVideoType(mimeType)) {
      return { width: null, height: null };
    }
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width || null, height: metadata.height || null };
  } catch {
    return { width: null, height: null };
  }
}

async function createThumbnail(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  try {
    if (mimeType === 'image/svg+xml' || mimeType === 'image/gif' || isVideoType(mimeType)) {
      return null;
    }
    const thumbnailDir = join(UPLOAD_DIR, 'thumbnails');
    await mkdir(thumbnailDir, { recursive: true });
    const thumbnailFilename = `thumb-${filename}`;
    await sharp(buffer)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(join(thumbnailDir, thumbnailFilename));
    return `thumbnails/${thumbnailFilename}`;
  } catch (err) {
    logger.warn('media.thumbnail_failed', { err, filename });
    return null;
  }
}

/** Tiny base64 placeholder for `next/image`'s blur — the column existed but was never filled. */
async function createBlurData(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (mimeType === 'image/svg+xml' || isVideoType(mimeType)) return null;
    const tiny = await sharp(buffer).resize(10, 10, { fit: 'inside' }).webp({ quality: 20 }).toBuffer();
    return `data:image/webp;base64,${tiny.toString('base64')}`;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * GET — list
 * ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const { error } = await requireEditor(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const pagination = getPagination(searchParams, { defaultLimit: 20, maxLimit: 100 });
    const search = getSearch(searchParams, 'search') || getSearch(searchParams, 'q');
    const trashed = searchParams.get('trashed') === 'true';

    const where: string[] = [trashed ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'];
    const params: any[] = [];

    if (search) {
      // Parenthesised: without the brackets the OR would escape the deleted_at
      // condition and trashed rows would leak into the normal listing.
      where.push('(filename LIKE ? OR alt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM media ${whereSql}`, params);
    const total = Number((countRows as any[])[0]?.total ?? 0);

    const [rows] = await pool.execute(
      `SELECT id, filename, path, alt, width, height, size_bytes, mime_type,
              thumbnail_path, blur_data, uploaded_at, deleted_at
         FROM media ${whereSql}
        ORDER BY uploaded_at DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
      params
    );

    return ok(paginatedResponse((rows as MediaRow[]).map(toMediaDto), total, pagination));
  } catch (err) {
    logger.error('media.list_failed', { err });
    return serverError('Could not load the media library', err);
  }
}

/* ------------------------------------------------------------------ *
 * POST — upload, plus an action envelope for hosts that block DELETE/PATCH
 * ------------------------------------------------------------------ */

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('delete'),
    ids: z.array(z.number().int().positive()).min(1).max(100),
    force: z.boolean().optional().default(false),
    purge: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal('restore'),
    ids: z.array(z.number().int().positive()).min(1).max(100),
  }),
  z.object({
    action: z.literal('update'),
    id: z.number().int().positive(),
    alt: z.string().max(300),
  }),
]);

export async function POST(request: NextRequest) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const contentType = request.headers.get('content-type') || '';

  /**
   * JSON body means this is an action envelope, not an upload.
   *
   * Shared hosting reverse proxies commonly reject the DELETE and PATCH verbs
   * outright, returning an HTML error page that never reaches the route handler.
   * That is the most likely cause of the reported "Delete failed. Please try
   * again." — uploads (POST) worked while delete and alt-text edits did not.
   *
   * Routing those mutations through POST as well means the panel keeps working
   * whatever the proxy allows. Both paths call the same `deleteMedia()`.
   */
  if (contentType.includes('application/json')) {
    return handleAction(request, session);
  }

  const limit = rateLimit(`upload:${getClientIp(request)}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const altTexts = formData.getAll('alt') as string[];

    if (files.length === 0) return badRequest('No files provided');
    if (files.length > MAX_FILES_PER_REQUEST) {
      return badRequest(`Maximum ${MAX_FILES_PER_REQUEST} files per upload`);
    }

    const results: unknown[] = [];
    const errors: { filename: string; error: string }[] = [];

    await mkdir(UPLOAD_DIR, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const alt = sanitizePlainText(altTexts[i] || '').slice(0, 300);

      if (!ALLOWED_TYPES[file.type]) {
        errors.push({ filename: file.name, error: 'Invalid file type' });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ filename: file.name, error: 'File too large (max 10MB)' });
        continue;
      }

      let buffer = Buffer.from(await file.arrayBuffer());

      if (!validateMagicBytes(buffer, file.type)) {
        errors.push({ filename: file.name, error: 'File content does not match declared type' });
        continue;
      }

      /**
       * Strip scripts out of SVGs at rest, not just when serving.
       *
       * The serving route sanitizes too, but storing an already-clean file means a
       * future code path that reads the file directly can't reintroduce the XSS.
       */
      if (file.type === 'image/svg+xml') {
        const cleaned = sanitizeSvg(buffer.toString('utf8'));
        if (!cleaned.includes('<svg')) {
          errors.push({ filename: file.name, error: 'SVG could not be sanitized safely' });
          continue;
        }
        buffer = Buffer.from(cleaned, 'utf8');
      }

      const { width, height } = await getImageMetadata(buffer, file.type);
      const ext = ALLOWED_TYPES[file.type][0];
      const filename = generateSeoFilename(file.name, ext);
      const storagePath = filename; // canonical: bare key relative to UPLOAD_DIR

      await writeFile(join(UPLOAD_DIR, filename), buffer);

      const [thumbnailRelPath, blurData] = await Promise.all([
        createThumbnail(buffer, file.type, filename),
        createBlurData(buffer, file.type),
      ]);

      const [result] = await pool.execute(
        `INSERT INTO media (filename, path, alt, width, height, size_bytes, mime_type, thumbnail_path, blur_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          file.name.slice(0, 255),
          storagePath,
          alt,
          width,
          height,
          buffer.byteLength,
          file.type,
          thumbnailRelPath,
          blurData,
        ]
      );

      const id = (result as any).insertId as number;
      results.push(
        toMediaDto({
          id,
          filename: file.name,
          path: storagePath,
          alt,
          width,
          height,
          size_bytes: buffer.byteLength,
          mime_type: file.type,
          thumbnail_path: thumbnailRelPath,
          blur_data: blurData,
          uploaded_at: new Date().toISOString(),
          deleted_at: null,
        })
      );

      after(() =>
        logAudit({
          action: 'create',
          entity: 'media',
          entityId: id,
          actor: session,
          after: { filename: file.name, size: buffer.byteLength, mime: file.type },
          request,
        })
      );
    }

    return ok({
      success: true,
      uploaded: results.length,
      errors: errors.length > 0 ? errors : undefined,
      data: results.length === 1 ? results[0] : results,
    });
  } catch (err) {
    logger.error('media.upload_failed', { err });
    return serverError('Upload failed', err);
  }
}

async function handleAction(request: NextRequest, session: { userId: number; email: string }) {
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = actionSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const payload = validation.data;

  try {
    if (payload.action === 'update') {
      const [existing] = await pool.execute(
        'SELECT id FROM media WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [payload.id]
      );
      if ((existing as any[]).length === 0) return notFound('Media not found');

      const alt = sanitizePlainText(payload.alt).slice(0, 300);
      await pool.execute('UPDATE media SET alt = ? WHERE id = ?', [alt, payload.id]);

      after(() =>
        logAudit({
          action: 'update',
          entity: 'media',
          entityId: payload.id,
          actor: session,
          after: { alt },
          request,
        })
      );

      return ok({ success: true, id: payload.id, alt });
    }

    if (payload.action === 'restore') {
      const restored: number[] = [];
      for (const id of payload.ids) {
        if (await restoreMedia(id)) restored.push(id);
      }
      after(() =>
        logAudit({
          action: 'restore',
          entity: 'media',
          entityId: restored.join(','),
          actor: session,
          request,
          meta: { ids: restored },
        })
      );
      return ok({ success: true, restored });
    }

    // action === 'delete' — supports bulk selection.
    const deleted: number[] = [];
    const blocked: { id: number; references: unknown[] }[] = [];
    const missing: number[] = [];

    for (const id of payload.ids) {
      const outcome = await deleteMedia(id, { force: payload.force, purge: payload.purge });
      if (outcome.ok) deleted.push(id);
      else if (outcome.code === 'referenced') blocked.push({ id, references: outcome.references });
      else missing.push(id);
    }

    if (deleted.length > 0) {
      after(() =>
        logAudit({
          action: payload.purge ? 'purge' : 'delete',
          entity: 'media',
          entityId: deleted.join(','),
          actor: session,
          request,
          meta: { ids: deleted, force: payload.force, purge: payload.purge },
        })
      );
    }

    // Nothing deleted and everything blocked → report it as a conflict so the
    // client can show which content is using the files.
    if (deleted.length === 0 && blocked.length > 0) {
      return conflict('Media is referenced by other content', {
        references: blocked.flatMap((b) => b.references),
        blocked,
      });
    }

    return ok({ success: true, deleted, blocked, missing, purged: payload.purge });
  } catch (err) {
    logger.error('media.action_failed', { err, action: payload.action });
    return serverError('The requested media action failed', err);
  }
}
