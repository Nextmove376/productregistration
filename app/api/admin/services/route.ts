import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

const serviceSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  tag: z.string().max(50).optional().default(''),
  summary: z.string().max(500).optional().default(''),
  body: z.any().optional().nullable(),
  icon: z.string().max(100).optional().default(''),
  hero_image: z.string().max(500).optional().default(''),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.number().int().min(0).max(1).optional().default(1),
  meta_title: z.string().max(200).optional().default(''),
  meta_description: z.string().max(300).optional().default(''),
  og_image: z.string().max(500).optional().default(''),
});

export async function GET() {
  const [rows] = await pool.execute('SELECT * FROM services ORDER BY sort_order');
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json();
  const validation = serviceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const d = validation.data;
  const [result] = await pool.execute(
    'INSERT INTO services (title, slug, tag, summary, body, icon, hero_image, sort_order, is_active, meta_title, meta_description, og_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [d.title, d.slug, d.tag, d.summary, d.body ? JSON.stringify(d.body) : null, d.icon, d.hero_image, d.sort_order, d.is_active, d.meta_title, d.meta_description, d.og_image]
  );
  return NextResponse.json({ id: (result as any).insertId });
}
