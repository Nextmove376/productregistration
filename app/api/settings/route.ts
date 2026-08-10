import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/api-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const settingsSchema = z.record(z.string(), z.string().max(5000));

const PUBLIC_KEYS = [
  'site_name', 'logo_header', 'logo_footer', 'email', 'phone', 'address',
  'working_hours', 'footer_tagline', 'footer_legal', 'social_links',
  'whatsapp_enabled', 'whatsapp_greeting', 'whatsapp_agents',
  'phone_enabled', 'phone_greeting', 'phone_agents',
];

export async function GET() {
  const rows = await query<{ setting_key: string; value: string | null }>(
    'SELECT setting_key, value FROM settings'
  );

  const settings: Record<string, string> = {};
  for (const { setting_key, value } of rows) {
    if (value !== null) settings[setting_key] = value;
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const entries = Object.entries(parsed.data);
  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
  }

  for (const [key, value] of entries) {
    await execute(
      `INSERT INTO settings (setting_key, value, updated_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [key, value]
    );
  }

  return NextResponse.json({ success: true });
}
