import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { invalidateSettingsCache } from '@/lib/settings';

const PUBLIC_KEYS = new Set([
  'site_name', 'logo_url', 'email', 'address', 'working_hours',
  'phone_numbers', 'whatsapp_contacts', 'social_links', 'footer_text',
  'meta_title', 'meta_description', 'og_image',
]);

export async function GET() {
  const [rows] = await pool.execute('SELECT `key`, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows as any[]) {
    if (PUBLIC_KEYS.has(row.key)) {
      settings[row.key] = row.value;
    }
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json();
  const settingsSchema = z.record(z.string(), z.string().max(10000));
  const validation = settingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const upsert = await conn.prepare(
      'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), type = VALUES(type)'
    );
    for (const [key, value] of Object.entries(body)) {
      const type = key.includes('url') || key.includes('image') ? 'image' : key.includes('link') || key.includes('json') || key.includes('numbers') || key.includes('contacts') ? 'json' : 'text';
      await upsert.execute([key, value, type]);
    }
    await upsert.close();
    await conn.commit();
    invalidateSettingsCache();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return NextResponse.json({ success: true });
}
