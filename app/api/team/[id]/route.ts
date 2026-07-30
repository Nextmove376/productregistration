import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

const teamUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  photo_url: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const validation = teamUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    'UPDATE team_members SET name = ?, role = ?, photo_url = ?, whatsapp = ?, phone = ?, email = ?, sort_order = ? WHERE id = ?'
  ).run(body.name, body.role, body.photo_url || '', body.whatsapp || '', body.phone || '', body.email || '', body.sort_order || 0, id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
