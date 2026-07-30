import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  photo_url: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
});

export async function GET() {
  const db = getDb();
  const members = db.prepare('SELECT id, name, role, photo_url, sort_order FROM team_members ORDER BY sort_order').all();
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const validation = teamMemberSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO team_members (name, role, photo_url, whatsapp, phone, email, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(body.name, body.role, body.photo_url || '', body.whatsapp || '', body.phone || '', body.email || '', body.sort_order || 0);
  return NextResponse.json({ id: result.lastInsertRowid });
}
