import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

const teamUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  bio: z.string().max(2000).optional().default(''),
  linkedin: z.string().url().optional().or(z.literal('')),
  photo_url: z.string().max(500).optional().default(''),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().max(20).optional().default(''),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.number().int().min(0).max(1).optional().default(1),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rows] = await pool.execute('SELECT * FROM team_members WHERE id = ?', [id]);
  const member = (rows as any[])[0];
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(member);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const validation = teamUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const d = validation.data;
  await pool.execute(
    'UPDATE team_members SET name=?, role=?, bio=?, linkedin=?, photo_url=?, phone=?, email=?, whatsapp=?, sort_order=?, is_active=? WHERE id=?',
    [d.name, d.role, d.bio, d.linkedin || null, d.photo_url, d.phone, d.email || null, d.whatsapp, d.sort_order, d.is_active, id]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  await pool.execute('DELETE FROM team_members WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
