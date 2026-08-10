import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeRichText, slugify, readingMinutes } from '@/lib/sanitize';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  featured_image: z.string().url().optional().or(z.literal('')),
  image_alt: z.string().max(200).optional().or(z.literal('')),
  category_id: z.number().int().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  meta_title: z.string().max(200).optional().or(z.literal('')),
  meta_description: z.string().max(320).optional().or(z.literal('')),
});

export async function GET() {
  const posts = await query<{
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    featured_image: string | null;
    image_alt: string | null;
    status: string;
    published_at: string | null;
    reading_minutes: number;
    views: number;
    created_at: string;
  }>(
    `SELECT id, title, slug, excerpt, featured_image, image_alt, status, published_at, reading_minutes, views, created_at
     FROM posts ORDER BY created_at DESC`
  );
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = blogPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const sanitizedContent = sanitizeRichText(d.content);
  const minutes = readingMinutes(sanitizedContent);
  const finalSlug = d.slug || slugify(d.title);

  const result = await execute(
    `INSERT INTO posts
      (slug, title, excerpt, content, featured_image, image_alt, category_id, author,
       status, published_at, meta_title, meta_description, reading_minutes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?, ?,?)`,
    [
      finalSlug, d.title, d.excerpt || null, sanitizedContent,
      d.featured_image || null, d.image_alt || null, d.category_id || null,
      session!.name,
      d.status, d.status === 'published' ? new Date() : null,
      d.meta_title || null, d.meta_description || null, minutes,
    ]
  );

  return NextResponse.json({ id: result.insertId });
}
