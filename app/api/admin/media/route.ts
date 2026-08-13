import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute('SELECT * FROM media ORDER BY uploaded_at DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [countRows] = await pool.execute('SELECT COUNT(*) as total FROM media');
  const total = (countRows as any[])[0].total;

  return NextResponse.json({ data: rows, total, page, limit });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const alt = formData.get('alt') as string || '';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WebP, SVG, GIF' }, { status: 400 });
  }

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Ensure upload directory exists
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filepath = join(uploadDir, filename);
  const publicPath = `/uploads/${filename}`;

  await writeFile(filepath, buffer);

  // Insert into DB
  const [result] = await pool.execute(
    'INSERT INTO media (filename, path, size_bytes, alt) VALUES (?, ?, ?, ?)',
    [file.name, publicPath, file.size, alt]
  );

  return NextResponse.json({ id: (result as any).insertId, path: publicPath, filename: file.name });
}
