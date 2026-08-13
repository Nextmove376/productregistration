import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;
  const [rows] = await pool.execute('SELECT * FROM submissions WHERE id = ?', [id]);
  const sub = (rows as any[])[0];
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(sub);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  await pool.execute(
    'UPDATE submissions SET status=?, notes=? WHERE id=?',
    [body.status, body.notes || null, id]
  );
  return NextResponse.json({ success: true });
}
