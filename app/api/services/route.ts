import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const [rows] = await pool.execute(
    'SELECT id, slug, title, tag, summary, icon, hero_image, sort_order FROM services WHERE is_active = 1 ORDER BY sort_order'
  );
  return NextResponse.json(rows);
}
