import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateServices } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { serviceSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import {
  conflict,
  created,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  serverError,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Admin services list.
 *
 * This handler had **no auth check at all** despite living under `/api/admin/`,
 * and returned `SELECT *` — so anyone could enumerate every service row including
 * inactive ones and all SEO metadata.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireEditor(request);
  if (error) return error;

  try {
    const [rows] = await pool.execute(
      `SELECT id, slug, title, tag, summary, icon, hero_image, sort_order, is_active,
              meta_title, meta_description, og_image, created_at, updated_at
         FROM services
        WHERE deleted_at IS NULL
        ORDER BY sort_order, title`
    );
    return ok(rows);
  } catch (err) {
    logger.error('services.list_failed', { err });
    return serverError('Could not load services', err);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = serviceSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;
  const title = sanitizePlainText(d.title);

  try {
    const [result] = await pool.execute(
      `INSERT INTO services
         (title, slug, tag, summary, body, icon, hero_image, sort_order, is_active,
          meta_title, meta_description, og_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );

    const id = (result as any).insertId as number;
    revalidateServices(d.slug);

    after(() =>
      logAudit({
        action: 'create',
        entity: 'service',
        entityId: id,
        actor: session,
        after: { slug: d.slug, title },
        request,
      })
    );

    return created({ id, slug: d.slug });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('A service with that slug already exists.', { field: 'slug' });
    }
    logger.error('services.create_failed', { err, slug: d.slug });
    return serverError('Could not create the service', err);
  }
}
