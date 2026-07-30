import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { stripUnsafeHTML } from '@/lib/sanitize';
import { z } from 'zod';

const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  featured_image: z.string().url().optional().or(z.literal('')),
  is_published: z.preprocess((v) => (v === true ? 1 : v === false ? 0 : v), z.number().int().min(0).max(1)),
});

export async function GET() {
  const db = getDb();
  const posts = db.prepare('SELECT id, title, slug, excerpt, featured_image, is_published, created_at FROM blog_posts WHERE is_published = 1 ORDER BY created_at DESC').all();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const validation = blogPostSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const db = getDb();
  const sanitizedContent = stripUnsafeHTML(body.content);
  const result = db.prepare(
    'INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, is_published) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(body.title, body.slug, body.excerpt, sanitizedContent, body.featured_image || '', validation.data.is_published);
  return NextResponse.json({ id: result.lastInsertRowid });
}
