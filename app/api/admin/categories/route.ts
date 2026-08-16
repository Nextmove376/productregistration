import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateBlog } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { categorySchema } from '@/lib/schemas';
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
 * Categories CRUD.
 *
 * The `categories` table and the `posts.category_id` foreign key already existed
 * in the schema, but there was no API and no admin screen — so posts could never
 * be categorised.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireEditor(request);
  if (error) return error;

  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.name, c.slug, c.description, c.sort_order, c.created_at,
              COUNT(p.id) AS post_count
         FROM categories c
         LEFT JOIN posts p ON p.category_id = c.id AND p.deleted_at IS NULL
        GROUP BY c.id
        ORDER BY c.sort_order, c.name`
    );
    return ok(rows);
  } catch (err) {
    logger.error('categories.list_failed', { err });
    return serverError('Could not load categories', err);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = categorySchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;
  const name = sanitizePlainText(d.name);

  try {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)',
      [name, d.slug, sanitizePlainText(d.description ?? ''), d.sort_order ?? 0]
    );

    const id = (result as any).insertId as number;
    revalidateBlog();

    after(() =>
      logAudit({
        action: 'create',
        entity: 'category',
        entityId: id,
        actor: session,
        after: { name, slug: d.slug },
        request,
      })
    );

    return created({ id, name, slug: d.slug });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('A category with that slug already exists.', { field: 'slug' });
    }
    logger.error('categories.create_failed', { err });
    return serverError('Could not create the category', err);
  }
}
