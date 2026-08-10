import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const teamUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(120),
  bio: z.string().max(1000).optional().or(z.literal('')),
  photo_url: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await queryOne('SELECT * FROM team_members WHERE id = ?', [id]);
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(member);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = teamUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  await execute(
    `UPDATE team_members SET
      name = ?, role = ?, bio = ?, photo_url = ?, whatsapp = ?, phone = ?, email = ?,
      linkedin = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [
      d.name, d.role, d.bio || null, d.photo_url || null,
      d.whatsapp || null, d.phone || null, d.email || null, d.linkedin || null,
      d.sort_order ?? 0, d.is_active ?? true, id,
    ]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  await execute('DELETE FROM team_members WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
