import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

const blogUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  featured_image: z.string().url().optional().or(z.literal('')),
  is_published: z.number().int().min(0).max(1),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id);
  return NextResponse.json(post);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const validation = blogUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    'UPDATE blog_posts SET title = ?, slug = ?, excerpt = ?, content = ?, featured_image = ?, is_published = ? WHERE id = ?'
  ).run(body.title, body.slug, body.excerpt, body.content, body.featured_image || '', body.is_published || 0, id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
