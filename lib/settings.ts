import pool from '@/lib/db';

interface CachedSettings {
  data: Record<string, string>;
  fetchedAt: number;
}

let cache: CachedSettings | null = null;
const TTL_MS = 60 * 1000; // 60 seconds

export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.data;
  }

  const [rows] = await pool.execute('SELECT `key`, `value` FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows as any[]) {
    settings[row.key] = row.value;
  }

  cache = { data: settings, fetchedAt: Date.now() };
  return settings;
}

export async function getSetting(key: string): Promise<string | null> {
  const settings = await getSettings();
  return settings[key] ?? null;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

// Public-safe keys only — never expose SMTP, DB, or internal config
const PUBLIC_KEYS = new Set([
  'site_name', 'logo_url', 'email', 'address', 'working_hours',
  'phone_numbers', 'whatsapp_contacts', 'social_links', 'footer_text',
  'meta_title', 'meta_description', 'og_image',
]);

export async function getPublicSettings(): Promise<Record<string, string>> {
  const all = await getSettings();
  const public_: Record<string, string> = {};
  for (const [key, value] of Object.entries(all)) {
    if (PUBLIC_KEYS.has(key)) {
      public_[key] = value;
    }
  }
  return public_;
}
