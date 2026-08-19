import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { captureRevision } from '@/lib/revisions';
import { revalidateBlog } from '@/lib/revalidate';
import { sanitizePlainText, sanitizeRichText } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { readingMinutes, toMysqlDateTime } from '@/lib/content';
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

const imageRef = z
  .string()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'Must be a site-relative path or an absolute http(s) URL',
  });

const blogUpdateSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500).optional().default(''),
  content: z.string().min(1),
  featured_image: imageRef.optional().nullable(),
  image_alt: z.string().max(200).optional().default(''),
  category_id: z.number().int().positive().optional().nullable(),
  author: z.string().max(100).optional().default(''),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  published_at: z.string().optional().nullable(),
  meta_title: z.string().max(200).optional().default(''),
  meta_description: z.string().max(300).optional().default(''),
  og_image: imageRef.optional().nullable(),
  canonical_url: z.string().max(500).optional().nullable(),
  noindex: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional().default(0),
});

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Single post for the admin editor.
 *
 * Previously this was an unauthenticated `SELECT *`, which meant anyone who
 * guessed an id could read an unpublished draft in full. It now requires a
 * session.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor(request);
  if (error) return error;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return badRequest('Invalid post id');

  const [rows] = await pool.execute(
    `SELECT id, slug, title, excerpt, content, featured_image, image_alt, category_id, author,
            status, published_at, meta_title, meta_description, og_image, canonical_url, noindex,
            reading_minutes, views, created_at, updated_at
       FROM posts
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );

  const post = (rows as any[])[0];
  if (!post) return notFound('Post not found');
  return ok(post);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return badRequest('Invalid post id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = blogUpdateSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  const [existingRows] = await pool.execute(
    'SELECT id, slug, title, status FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('Post not found');

  const content = sanitizeRichText(d.content);
  if (!content.trim()) {
    return validationFailed([{ path: ['content'], message: 'Content is empty after sanitization' }]);
  }

  const title = sanitizePlainText(d.title);
  const publishedAt =
    d.published_at && d.published_at.trim()
      ? d.published_at
      : d.status === 'published'
        ? toMysqlDateTime()
        : null;

  try {
    /**
     * Snapshot the row before it is overwritten — awaited, deliberately not in
     * `after()`.
     *
     * `after()` runs once the response has been sent, by which point the `UPDATE`
     * below has already replaced the values the revision was meant to preserve.
     * `captureRevision` swallows its own failures, so this cannot fail the save.
     */
    await captureRevision(id, { actor: session, note: 'autosaved before edit' });

    await pool.execute(
      `UPDATE posts SET
          title=?, slug=?, excerpt=?, content=?, featured_image=?, image_alt=?, category_id=?,
          author=?, status=?, published_at=?, meta_title=?, meta_description=?, og_image=?,
          canonical_url=?, noindex=?, reading_minutes=?
        WHERE id=? AND deleted_at IS NULL`,
      [
        title,
        d.slug,
        sanitizePlainText(d.excerpt ?? ''),
        content,
        d.featured_image || null,
        sanitizePlainText(d.image_alt ?? ''),
        d.category_id ?? null,
        sanitizePlainText(d.author ?? ''),
        d.status,
        publishedAt,
        sanitizePlainText(d.meta_title ?? ''),
        sanitizePlainText(d.meta_description ?? ''),
        d.og_image || null,
        d.canonical_url || null,
        Number(d.noindex) ? 1 : 0,
        readingMinutes(content),
        id,
      ]
    );

    // Refresh both slugs when the slug changed, so the old URL stops serving.
    revalidateBlog(d.slug);
    if (existing.slug && existing.slug !== d.slug) revalidateBlog(existing.slug);

    after(() =>
      logAudit({
        action: 'update',
        entity: 'post',
        entityId: id,
        actor: session,
        before: { slug: existing.slug, title: existing.title, status: existing.status },
        after: { slug: d.slug, title, status: d.status },
        request,
      })
    );

    return ok({ success: true, id, slug: d.slug });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('Another post already uses that slug.', { field: 'slug' });
    }
    logger.error('blog.update_failed', { err, id });
    return serverError('Could not update the post', err);
  }
}

/**
 * Soft delete by default; `?purge=true` (admin only) removes the row for good.
 * Previously this was an unconditional hard `DELETE` with no way back.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const purge = new URL(request.url).searchParams.get('purge') === 'true';

  const { session, error } = purge ? await requireAdmin(request) : await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return badRequest('Invalid post id');

  const [rows] = await pool.execute('SELECT id, slug, title, status FROM posts WHERE id = ? LIMIT 1', [id]);
  const post = (rows as any[])[0];
  if (!post) return notFound('Post not found');

  try {
    if (purge) {
      await pool.execute('DELETE FROM posts WHERE id = ?', [id]);
    } else {
      await pool.execute('UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    }

    revalidateBlog(post.slug);

    after(() =>
      logAudit({
        action: purge ? 'purge' : 'delete',
        entity: 'post',
        entityId: id,
        actor: session,
        before: { slug: post.slug, title: post.title, status: post.status },
        request,
      })
    );

    return ok({ success: true, id, purged: purge });
  } catch (err) {
    logger.error('blog.delete_failed', { err, id, purge });
    return serverError('Could not delete the post', err);
  }
}
