import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateServices } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { serviceSchema } from '@/lib/schemas';
import { selectList, softDeleteFilter } from '@/lib/schema';
import { withSchemaHeal } from '@/lib/schema-repair';
import { SEED_SLUGS, ensureServicesSeeded } from '@/lib/service-seed';
import { logger } from '@/lib/logger';
import {
  adminServerError,
  conflict,
  created,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Admin services list.
 *
 * This handler had **no auth check at all** despite living under `/api/admin/`,
 * and returned `SELECT *` — so anyone could enumerate every service row including
 * inactive ones and all SEO metadata.
 *
 * It is also the screen that reported "Could not load services" on the live site. The
 * cause was schema drift: the production `services` table predates several of the
 * columns named below, so MySQL answered errno 1054 and the catch turned that into a
 * generic toast. Two changes make that impossible now — the column list is narrowed to
 * what the table actually has (`selectList`), and the six code-defined service pages
 * are seeded on demand so the list is never mysteriously empty.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireEditor(request);
  if (error) return error;

  try {
    const list = await withSchemaHeal(async () => {
      const seeded = await ensureServicesSeeded();
      if (seeded.length > 0) {
        logger.info('services.seeded', { slugs: seeded });
        revalidateServices();
      }

      const columns = await selectList('services', [
        'id', 'slug', 'title', 'tag', 'summary', 'icon', 'hero_image', 'sort_order',
        'is_active', 'meta_title', 'meta_description', 'og_image', 'created_at', 'updated_at',
      ]);
      const notDeleted = await softDeleteFilter('services');

      const [rows] = await pool.query(
        `SELECT ${columns} FROM services WHERE 1=1${notDeleted} ORDER BY sort_order, title`
      );

      // Flag the rows that have a static page behind them: those are the six existing
      // pages, and the UI can then say "edit page content" rather than implying the
      // service only exists as a database row.
      return (rows as Record<string, unknown>[]).map((row) => ({
        ...row,
        has_page: SEED_SLUGS.has(String(row.slug)),
      }));
    });

    return ok(list);
  } catch (err) {
    logger.error('services.list_failed', { err });
    return adminServerError('Could not load services', err);
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
    const [result] = await withSchemaHeal(() =>
      pool.execute(
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
      )
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
    return adminServerError('Could not create the service', err);
  }
}
