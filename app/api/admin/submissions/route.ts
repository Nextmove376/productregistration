import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;

  try {
    let sql = `SELECT id, name, email, phone, company, service, message, source_page,
               status, mail_status, created_at FROM submissions`;
    const params: unknown[] = [];

    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const submissions = await query(sql, params);
    return NextResponse.json(submissions);
  } catch (err) {
    console.error('[submissions] query failed:', err);
    return NextResponse.json([]);
  }
}

const updateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost']).optional(),
  notes: z.string().max(5000).optional(),
});

export async function PATCH(request: Request) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  const d = parsed.data;
  const sets: string[] = [];
  const params: unknown[] = [];

  if (d.status) { sets.push('status = ?'); params.push(d.status); }
  if (d.notes !== undefined) { sets.push('notes = ?'); params.push(d.notes); }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  params.push(id);
  await execute(`UPDATE submissions SET ${sets.join(', ')} WHERE id = ?`, params);

  return NextResponse.json({ success: true });
}
