import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeRichText, readingMinutes } from '@/lib/sanitize';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const blogUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500).optional().or(z.literal('')),
  content: z.string().min(1),
  featured_image: z.string().url().optional().or(z.literal('')),
  image_alt: z.string().max(200).optional().or(z.literal('')),
  category_id: z.number().int().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  published_at: z.string().optional().or(z.literal('')),
  meta_title: z.string().max(200).optional().or(z.literal('')),
  meta_description: z.string().max(320).optional().or(z.literal('')),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await queryOne(
    `SELECT * FROM posts WHERE id = ?`,
    [id]
  );
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = blogUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const sanitizedContent = sanitizeRichText(d.content);
  const minutes = readingMinutes(sanitizedContent);

  await execute(
    `UPDATE posts SET
      slug = ?, title = ?, excerpt = ?, content = ?, featured_image = ?, image_alt = ?,
      category_id = ?, status = ?, published_at = ?, meta_title = ?, meta_description = ?,
      reading_minutes = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      d.slug, d.title, d.excerpt || null, sanitizedContent,
      d.featured_image || null, d.image_alt || null, d.category_id || null,
      d.status, d.published_at || null,
      d.meta_title || null, d.meta_description || null, minutes,
      id,
    ]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  await execute('DELETE FROM posts WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
