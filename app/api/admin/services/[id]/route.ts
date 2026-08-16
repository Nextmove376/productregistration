import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateServices } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { serviceSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
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
  if (!id) return badRequest('Invalid service id');

  const [rows] = await pool.execute(
    `SELECT id, slug, title, tag, summary, body, icon, hero_image, sort_order, is_active,
            meta_title, meta_description, og_image, created_at, updated_at
       FROM services
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  const service = (rows as any[])[0];
  if (!service) return notFound('Service not found');
  return ok(service);
}

/**
 * Update.
 *
 * This handler previously had **no zod validation** — it read `body.title`,
 * `body.slug`, `body.sort_order` and friends straight out of the request and
 * passed them to `pool.execute`, so a malformed or oversized payload went
 * directly at the column definitions.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid service id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = serviceSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  const [existingRows] = await pool.execute(
    'SELECT id, slug, title FROM services WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('Service not found');

  const title = sanitizePlainText(d.title);

  try {
    await pool.execute(
      `UPDATE services SET
          title=?, slug=?, tag=?, summary=?, body=?, icon=?, hero_image=?, sort_order=?,
          is_active=?, meta_title=?, meta_description=?, og_image=?
        WHERE id=? AND deleted_at IS NULL`,
      [
        title,
        d.slug,
        sanitizePlainText(d.tag ?? ''),
        sanitizePlainText(d.summary ?? ''),
        d.body ? JSON.stringify(d.body) : null,
        d.icon ?? '',
        d.hero_image ?? '',
        d.sort_order ?? 0,
        d.is_active ?? 1,
        sanitizePlainText(d.meta_title ?? ''),
        sanitizePlainText(d.meta_description ?? ''),
        d.og_image ?? '',
        id,
      ]
    );

    revalidateServices(d.slug);
    if (existing.slug && existing.slug !== d.slug) revalidateServices(existing.slug);

    after(() =>
      logAudit({
        action: 'update',
        entity: 'service',
        entityId: id,
        actor: session,
        before: { slug: existing.slug, title: existing.title },
        after: { slug: d.slug, title },
        request,
      })
    );

    return ok({ success: true, id, slug: d.slug });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('Another service already uses that slug.', { field: 'slug' });
    }
    logger.error('services.update_failed', { err, id });
    return serverError('Could not update the service', err);
  }
}

/**
 * Soft delete, with a reference check.
 *
 * Previously an unconditional hard `DELETE` with no checks: a service could be
 * removed while pages still linked to its slug, with no way to undo it.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(request.url);
  const purge = url.searchParams.get('purge') === 'true';

  const { session, error } = purge ? await requireAdmin(request) : await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid service id');

  const [rows] = await pool.execute('SELECT id, slug, title FROM services WHERE id = ? LIMIT 1', [id]);
  const service = (rows as any[])[0];
  if (!service) return notFound('Service not found');

  try {
    if (purge) {
      await pool.execute('DELETE FROM services WHERE id = ?', [id]);
    } else {
      await pool.execute('UPDATE services SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    }

    revalidateServices(service.slug);

    after(() =>
      logAudit({
        action: purge ? 'purge' : 'delete',
        entity: 'service',
        entityId: id,
        actor: session,
        before: { slug: service.slug, title: service.title },
        request,
      })
    );

    return ok({ success: true, id, purged: purge });
  } catch (err) {
    logger.error('services.delete_failed', { err, id, purge });
    return serverError('Could not delete the service', err);
  }
}
