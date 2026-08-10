import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const serviceSchema = z.object({
  title: z.string().min(1).max(150),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  tag: z.string().max(60).optional().or(z.literal('')),
  summary: z.string().max(500).optional().or(z.literal('')),
  body: z.string().optional().or(z.literal('')),
  icon: z.string().max(60).optional().or(z.literal('')),
  hero_image: z.string().url().optional().or(z.literal('')),
  timeline: z.string().max(60).optional().or(z.literal('')),
  meta_title: z.string().max(200).optional().or(z.literal('')),
  meta_description: z.string().max(320).optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const services = await query(
    `SELECT id, slug, title, tag, summary, icon, hero_image, timeline, sort_order, is_active
     FROM services WHERE is_active = 1 ORDER BY sort_order, id`
  );
  return NextResponse.json(services);
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

  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const result = await execute(
    `INSERT INTO services (slug, title, tag, summary, body, icon, hero_image, timeline, meta_title, meta_description, sort_order, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      d.slug, d.title, d.tag || null, d.summary || null,
      d.body || null, d.icon || null, d.hero_image || null, d.timeline || null,
      d.meta_title || null, d.meta_description || null,
      d.sort_order ?? 0, d.is_active ?? true,
    ]
  );

  return NextResponse.json({ id: result.insertId });
}
