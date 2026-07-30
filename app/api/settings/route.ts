import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

const settingsSchema = z.record(z.string(), z.string().max(500));

const PUBLIC_KEYS = [
  'company_name', 'company_tagline', 'address', 'working_hours',
  'google_maps_url', 'meta_description',
];

export async function GET() {
  const db = getDb();
  const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settingsObj: Record<string, string> = {};
  settings.forEach((s) => {
    if (PUBLIC_KEYS.includes(s.key)) {
      settingsObj[s.key] = s.value;
    }
  });
  return NextResponse.json(settingsObj);
}

export async function PUT(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const validation = settingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const db = getDb();
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
  Object.entries(body).forEach(([key, value]) => {
    update.run(key, value);
  });
  return NextResponse.json({ success: true });
}
