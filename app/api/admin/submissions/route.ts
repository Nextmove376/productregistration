import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM submissions';
  const params: any[] = [];
  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.execute(query, params);

  let countQuery = 'SELECT COUNT(*) as total FROM submissions';
  const countParams: any[] = [];
  if (status && status !== 'all') {
    countQuery += ' WHERE status = ?';
    countParams.push(status);
  }
  const [countRows] = await pool.execute(countQuery, countParams);
  const total = (countRows as any[])[0].total;

  return NextResponse.json({ data: rows, total, page, limit });
}
