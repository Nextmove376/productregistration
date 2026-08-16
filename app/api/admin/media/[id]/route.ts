import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { deleteMedia, getMediaById, toMediaDto } from '@/lib/media-service';
import { sanitizePlainText } from '@/lib/sanitize';
import {
  badRequest,
  conflict,
  csrfFailed,
  invalidJson,
  notFound,
  ok,
  parseJsonBody,
  serverError,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor(request);
  if (error) return error;

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid media ID');

  const media = await getMediaById(id);
  if (!media) return notFound('Media not found');
  return ok(toMediaDto(media));
}

// 300 chars matches the `media.alt` column, which migration 003 widened from 200.
const patchSchema = z.object({ alt: z.string().max(300) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid media ID');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = patchSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const existing = await getMediaById(id);
  if (!existing) return notFound('Media not found');

  const alt = sanitizePlainText(validation.data.alt).slice(0, 300);

  try {
    await pool.execute('UPDATE media SET alt = ? WHERE id = ?', [alt, id]);

    after(() =>
      logAudit({
        action: 'update',
        entity: 'media',
        entityId: id,
        actor: session,
        before: { alt: existing.alt },
        after: { alt },
        request,
      })
    );

    const updated = await getMediaById(id);
    return ok(updated ? toMediaDto(updated) : { id, alt });
  } catch (err) {
    logger.error('media.patch_failed', { err, id });
    return serverError('Could not update the alt text', err);
  }
}

/**
 * Delete one media item.
 *
 * The dozen `console.log("[DELETE] …")` debug lines that used to live here are
 * replaced by structured logging inside `lib/media-service.ts`, and the actual
 * work is shared with the `POST` action envelope in `../route.ts` so both paths
 * behave identically.
 *
 * Soft delete by default (recoverable from Trash); `?purge=true` is admin-only and
 * also unlinks the file.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';
  const purge = url.searchParams.get('purge') === 'true';

  const { session, error } = purge ? await requireAdmin(request) : await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid media ID');

  try {
    const media = await getMediaById(id, purge);
    const outcome = await deleteMedia(id, { force, purge });

    if (!outcome.ok) {
      if (outcome.code === 'not_found') return notFound('Media not found');
      return conflict('Media is referenced by other content', {
        references: outcome.references,
        hint: 'Retry with ?force=true to delete anyway.',
      });
    }

    after(() =>
      logAudit({
        action: purge ? 'purge' : 'delete',
        entity: 'media',
        entityId: id,
        actor: session,
        before: media ? { filename: media.filename, path: media.path } : undefined,
        request,
        meta: { force, purge },
      })
    );

    return ok({ success: true, id, purged: purge });
  } catch (err) {
    logger.error('media.delete_failed', { err, id, force, purge });
    return serverError('Could not delete the media file', err);
  }
}
