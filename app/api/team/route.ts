import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(120),
  bio: z.string().max(1000).optional().or(z.literal('')),
  photo_url: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const members = await query(
    `SELECT id, name, role, bio, photo_url, whatsapp, phone, email, linkedin, sort_order, is_active
     FROM team_members ORDER BY sort_order, id`
  );
  return NextResponse.json(members);
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

  const parsed = teamMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const result = await execute(
    `INSERT INTO team_members (name, role, bio, photo_url, whatsapp, phone, email, linkedin, sort_order, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      d.name, d.role, d.bio || null, d.photo_url || null,
      d.whatsapp || null, d.phone || null, d.email || null, d.linkedin || null,
      d.sort_order ?? 0, d.is_active ?? true,
    ]
  );

  return NextResponse.json({ id: result.insertId });
}
