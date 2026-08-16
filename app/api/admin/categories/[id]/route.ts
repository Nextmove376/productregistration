import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateBlog } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { categorySchema } from '@/lib/schemas';
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid category id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = categorySchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  const [existingRows] = await pool.execute('SELECT id, name, slug FROM categories WHERE id = ? LIMIT 1', [id]);
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('Category not found');

  const name = sanitizePlainText(d.name);

  try {
    await pool.execute(
      'UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?',
      [name, d.slug, sanitizePlainText(d.description ?? ''), d.sort_order ?? 0, id]
    );

    revalidateBlog();

    after(() =>
      logAudit({
        action: 'update',
        entity: 'category',
        entityId: id,
        actor: session,
        before: { name: existing.name, slug: existing.slug },
        after: { name, slug: d.slug },
        request,
      })
    );

    return ok({ success: true, id });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('Another category already uses that slug.', { field: 'slug' });
    }
    logger.error('categories.update_failed', { err, id });
    return serverError('Could not update the category', err);
  }
}

/**
 * Hard delete is safe here: `posts.category_id` has `ON DELETE SET NULL`, so posts
 * survive and simply become uncategorised. The count is reported back so the UI can
 * warn first.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid category id');

  const [existingRows] = await pool.execute('SELECT id, name, slug FROM categories WHERE id = ? LIMIT 1', [id]);
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('Category not found');

  try {
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM posts WHERE category_id = ? AND deleted_at IS NULL',
      [id]
    );
    const affectedPosts = Number((countRows as any[])[0]?.total ?? 0);

    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    revalidateBlog();

    after(() =>
      logAudit({
        action: 'delete',
        entity: 'category',
        entityId: id,
        actor: session,
        before: { name: existing.name, slug: existing.slug },
        request,
        meta: { uncategorisedPosts: affectedPosts },
      })
    );

    return ok({ success: true, id, uncategorisedPosts: affectedPosts });
  } catch (err) {
    logger.error('categories.delete_failed', { err, id });
    return serverError('Could not delete the category', err);
  }
}
