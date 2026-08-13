import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const bodyJson = body.body ? JSON.stringify(body.body) : null;
  await pool.execute(
    'UPDATE services SET title=?, slug=?, tag=?, summary=?, body=?, icon=?, hero_image=?, sort_order=?, is_active=?, meta_title=?, meta_description=?, og_image=? WHERE id=?',
    [body.title, body.slug, body.tag || '', body.summary || '', bodyJson, body.icon || '', body.hero_image || '', body.sort_order || 0, body.is_active ?? 1, body.meta_title || '', body.meta_description || '', body.og_image || '', id]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;
  await pool.execute('DELETE FROM services WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
