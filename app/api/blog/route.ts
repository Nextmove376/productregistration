import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checkCsrf, rateLimit, requireEditor } from '@/lib/api-auth';
import { verifySession } from '@/lib/dal';
import { logAudit } from '@/lib/audit';
import { revalidateBlog } from '@/lib/revalidate';
import { sanitizePlainText, sanitizeRichText } from '@/lib/sanitize';
import { getClientIp } from '@/lib/request-meta';
import { logger } from '@/lib/logger';
import { getEnumParam, getPagination, getSearch, paginatedResponse } from '@/lib/query-params';
import { readingMinutes, toMysqlDateTime } from '@/lib/content';
import {
  conflict,
  created,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  serverError,
  tooManyRequests,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/** A media path (`/api/media/x.jpg`) or an absolute URL — not `z.string().url()`, which rejected the former. */
const imageRef = z
  .string()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'Must be a site-relative path or an absolute http(s) URL',
  });

const blogPostSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
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

const PUBLIC_COLUMNS =
  'id, slug, title, excerpt, featured_image, image_alt, category_id, author, published_at, reading_minutes, views, created_at';
const ADMIN_COLUMNS = `${PUBLIC_COLUMNS}, status, meta_title, meta_description, updated_at`;

/**
 * Public listing.
 *
 * This handler previously returned every row regardless of status, so unpublished
 * drafts and future-dated scheduled posts were readable by anyone who called
 * `/api/blog`. It now defaults to published-and-due only, and returns admin
 * columns (including `status`) exclusively to an authenticated session.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    const { searchParams } = new URL(request.url);

    const pagination = getPagination(searchParams, { defaultLimit: 50, maxLimit: 100 });
    const search = getSearch(searchParams);
    const requestedStatus = getEnumParam(searchParams, 'status', ['draft', 'scheduled', 'published'] as const);

    const where: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (session) {
      // Admins may filter by status; an unknown value is ignored rather than trusted.
      if (requestedStatus) {
        where.push('status = ?');
        params.push(requestedStatus);
      }
    } else {
      where.push("status = 'published'");
      where.push('(published_at IS NULL OR published_at <= NOW())');
    }

    if (search) {
      where.push('(title LIKE ? OR excerpt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const columns = session ? ADMIN_COLUMNS : PUBLIC_COLUMNS;

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM posts ${whereSql}`, params);
    const total = Number((countRows as any[])[0]?.total ?? 0);

    // LIMIT/OFFSET are interpolated, not bound — see lib/query-params.ts for why
    // that is safe here.
    const [rows] = await pool.execute(
      `SELECT ${columns} FROM posts ${whereSql}
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
      params
    );

    return ok(paginatedResponse(rows as unknown[], total, pagination));
  } catch (err) {
    logger.error('blog.list_failed', { err });
    return serverError('Could not load posts', err);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const limit = rateLimit(`blog:write:${getClientIp(request)}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = blogPostSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  // Sanitize before storage so the database never holds an active payload.
  const content = sanitizeRichText(d.content);
  const title = sanitizePlainText(d.title);
  const excerpt = sanitizePlainText(d.excerpt ?? '');
  const metaTitle = sanitizePlainText(d.meta_title ?? '');
  const metaDescription = sanitizePlainText(d.meta_description ?? '');
  const imageAlt = sanitizePlainText(d.image_alt ?? '');
  const author = sanitizePlainText(d.author ?? '');

  if (!content.trim()) {
    return validationFailed([{ path: ['content'], message: 'Content is empty after sanitization' }]);
  }

  // A post marked published with no date should go live now, not sit with a NULL.
  const publishedAt =
    d.published_at && d.published_at.trim()
      ? d.published_at
      : d.status === 'published'
        ? toMysqlDateTime()
        : null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO posts
        (title, slug, excerpt, content, featured_image, image_alt, category_id, author,
         status, published_at, meta_title, meta_description, og_image, canonical_url, noindex, reading_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        d.slug,
        excerpt,
        content,
        d.featured_image || null,
        imageAlt,
        d.category_id ?? null,
        author,
        d.status,
        publishedAt,
        metaTitle,
        metaDescription,
        d.og_image || null,
        d.canonical_url || null,
        Number(d.noindex) ? 1 : 0,
        readingMinutes(content),
      ]
    );

    const id = (result as any).insertId as number;

    // Without this the row lands in the database but the live site keeps serving
    // its build-time HTML — the reason "publishing did nothing" before.
    revalidateBlog(d.slug);

    after(() =>
      logAudit({
        action: 'create',
        entity: 'post',
        entityId: id,
        actor: session,
        after: { slug: d.slug, title, status: d.status },
        request,
      })
    );

    return created({ id, slug: d.slug });
  } catch (err: any) {
    // Unique index on `slug`.
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('A post with that slug already exists. Choose a different slug.', { field: 'slug' });
    }
    logger.error('blog.create_failed', { err, slug: d.slug });
    return serverError('Could not create the post', err);
  }
}
