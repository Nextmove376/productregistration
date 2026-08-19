import pool from '@/lib/db';
import { logger } from '@/lib/logger';
import { resolveSettingsShape } from '@/lib/settings-schema';

/**
 * Settings registry.
 *
 * The allowed-key list used to be duplicated between this module and
 * `app/api/settings/route.ts`, and the PUT handler validated with
 * `z.record(z.string(), ...)` — which accepts *any* key — then iterated the raw
 * request body rather than the validated data. That let an authenticated request
 * write arbitrary rows into the settings table.
 *
 * One registry now drives three things: what the API accepts, how each value is
 * stored (`type`), and how the admin UI groups and labels the fields.
 */

export type SettingType = 'text' | 'textarea' | 'json' | 'image' | 'bool';
export type SettingGroup = 'general' | 'contact' | 'social' | 'seo';

export interface SettingDef {
  key: string;
  label: string;
  type: SettingType;
  group: SettingGroup;
  help?: string;
  maxLength: number;
  /** For `json` values — the expected shape, used for editor hints and validation. */
  jsonShape?: 'string[]' | 'record';
}

export const SETTING_DEFS: SettingDef[] = [
  // General
  { key: 'site_name', label: 'Site name', type: 'text', group: 'general', maxLength: 200 },
  { key: 'logo_url', label: 'Logo', type: 'image', group: 'general', maxLength: 500 },
  { key: 'footer_text', label: 'Footer text', type: 'textarea', group: 'general', maxLength: 2000 },

  // Contact
  { key: 'email', label: 'Contact email', type: 'text', group: 'contact', maxLength: 255 },
  { key: 'address', label: 'Address', type: 'textarea', group: 'contact', maxLength: 1000 },
  { key: 'working_hours', label: 'Working hours', type: 'text', group: 'contact', maxLength: 300 },
  {
    key: 'phone_numbers',
    label: 'Phone numbers',
    type: 'json',
    group: 'contact',
    jsonShape: 'string[]',
    help: 'One number per row. Shown in the header and phone widget.',
    maxLength: 4000,
  },
  {
    key: 'whatsapp_contacts',
    label: 'WhatsApp numbers',
    type: 'json',
    group: 'contact',
    jsonShape: 'string[]',
    help: 'One number per row, digits only (no + or spaces).',
    maxLength: 4000,
  },

  // Social
  {
    key: 'social_links',
    label: 'Social links',
    type: 'json',
    group: 'social',
    jsonShape: 'record',
    help: 'Platform name to profile URL, e.g. linkedin → https://…',
    maxLength: 4000,
  },

  // SEO
  { key: 'meta_title', label: 'Default meta title', type: 'text', group: 'seo', maxLength: 200 },
  { key: 'meta_description', label: 'Default meta description', type: 'textarea', group: 'seo', maxLength: 300 },
  { key: 'og_image', label: 'Default OG image', type: 'image', group: 'seo', maxLength: 500 },
];

export const SETTING_DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]));

/** Keys safe to serve to unauthenticated clients and render in public pages. */
export const PUBLIC_KEYS: ReadonlySet<string> = new Set(SETTING_DEFS.map((d) => d.key));

export const SETTING_GROUPS: { id: SettingGroup; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'contact', label: 'Contact' },
  { id: 'social', label: 'Social' },
  { id: 'seo', label: 'SEO' },
];

/** Maps a registry type onto the `settings.type` ENUM in the database. */
export function toColumnType(type: SettingType): 'text' | 'json' | 'image' | 'bool' {
  if (type === 'textarea') return 'text';
  return type;
}

/* ------------------------------------------------------------------ *
 * Read path
 * ------------------------------------------------------------------ */

interface CachedSettings {
  data: Record<string, string>;
  fetchedAt: number;
}

let cache: CachedSettings | null = null;
const TTL_MS = 60 * 1000; // 60 seconds

/**
 * All settings, cached in-process for 60 seconds.
 *
 * The column names are resolved at runtime rather than written into the query. This used
 * to be a literal `SELECT \`key\`, \`value\` FROM settings`, which failed with errno 1054
 * on the live database — that table predates this project and stores its names under a
 * different column. The failure was caught and the defaults returned, so every page
 * rendered plausible values and nothing ever revealed that settings were not being read
 * at all. Resolving the real columns is what makes the stored values visible.
 */
export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.data;
  }

  try {
    const shape = await resolveSettingsShape();
    if (!shape.keyColumn || !shape.valueColumn) {
      logger.error('settings.columns_unresolved', {
        keyColumn: shape.keyColumn,
        valueColumn: shape.valueColumn,
      });
      return cache?.data ?? {};
    }

    const [rows] = await pool.query(
      `SELECT \`${shape.keyColumn}\` AS k, \`${shape.valueColumn}\` AS v FROM settings`
    );

    const settings: Record<string, string> = {};
    for (const row of rows as { k: string | null; v: string | null }[]) {
      if (!row.k) continue;
      // Duplicate rows are possible: an earlier version of the save path appended
      // instead of updating. Prefer whichever copy actually holds a value.
      if (settings[row.k] && !row.v) continue;
      settings[row.k] = row.v ?? '';
    }

    cache = { data: settings, fetchedAt: Date.now() };
    return settings;
  } catch (err) {
    logger.error('settings.read_failed', { err });
    // Serve the last known good values rather than breaking every page.
    return cache?.data ?? {};
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const settings = await getSettings();
  return settings[key] ?? null;
}

/** Only registry keys — never SMTP credentials or anything else that lands in the table. */
export async function getPublicSettings(): Promise<Record<string, string>> {
  const all = await getSettings();
  const out: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) {
    if (all[key] !== undefined) out[key] = all[key];
  }
  return out;
}

/**
 * Parses a `json`-typed setting, returning a fallback when the stored value is
 * missing or malformed. Public pages must never crash on bad settings data.
 */
export function parseJsonSetting<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getPhoneNumbers(): Promise<string[]> {
  const raw = await getSetting('phone_numbers');
  const parsed = parseJsonSetting<unknown>(raw, []);
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  // Tolerate a plain comma-separated string.
  return typeof raw === 'string' && raw.trim() ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export async function getWhatsappContacts(): Promise<string[]> {
  const raw = await getSetting('whatsapp_contacts');
  const parsed = parseJsonSetting<unknown>(raw, []);
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  return typeof raw === 'string' && raw.trim() ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export async function getSocialLinks(): Promise<Record<string, string>> {
  const raw = await getSetting('social_links');
  const parsed = parseJsonSetting<unknown>(raw, {});
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)])
    );
  }
  return {};
}

/**
 * Clears the in-process cache.
 *
 * Note this alone is not enough to update the live site: the public pages are
 * rendered with ISR, so callers must also invalidate the route cache via
 * `revalidateSettings()` in `lib/revalidate.ts`.
 */
export function invalidateSettingsCache(): void {
  cache = null;
}
