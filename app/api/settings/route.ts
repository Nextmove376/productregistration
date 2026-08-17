import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateSettings } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import {
  PUBLIC_KEYS,
  SETTING_DEF_BY_KEY,
  getPublicSettings,
  invalidateSettingsCache,
  toColumnType,
} from '@/lib/settings';
import { presentColumns } from '@/lib/schema';
import { withSchemaHeal } from '@/lib/schema-repair';
import { logger } from '@/lib/logger';
import {
  adminServerError,
  badRequest,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  serverError,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await getPublicSettings());
  } catch (err) {
    logger.error('settings.get_failed', { err });
    return serverError('Could not load settings', err);
  }
}

/**
 * Only keys present in the settings registry are accepted, and each is checked
 * against its own declared type and length.
 *
 * The previous implementation validated with `z.record(z.string(), z.string())`,
 * which accepts any key at all, and then iterated the **raw request body** rather
 * than the validated output — so an authenticated request could insert arbitrary
 * rows into the settings table.
 */
const settingsSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .superRefine((body, ctx) => {
    const keys = Object.keys(body);

    if (keys.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'No settings provided' });
      return;
    }
    if (keys.length > PUBLIC_KEYS.size) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Too many keys' });
      return;
    }

    for (const key of keys) {
      const def = SETTING_DEF_BY_KEY.get(key);
      if (!def) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Unknown setting: ${key}` });
        continue;
      }

      const value = body[key] === null ? '' : String(body[key]);

      if (value.length > def.maxLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${def.label} must be ${def.maxLength} characters or fewer`,
        });
      }

      if (def.type === 'json' && value.trim()) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${def.label} must be valid JSON` });
          continue;
        }
        if (def.jsonShape === 'string[]' && !Array.isArray(parsed)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${def.label} must be a JSON array` });
        }
        if (
          def.jsonShape === 'record' &&
          (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        ) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${def.label} must be a JSON object` });
        }
      }

      if (def.type === 'image' && value.trim()) {
        const looksValid = value.startsWith('/') || /^https?:\/\//i.test(value);
        if (!looksValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${def.label} must be a site path or an http(s) URL`,
          });
        }
      }
    }
  });

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = settingsSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  // Iterate the *validated* data, never the raw body.
  const entries = Object.entries(validation.data);
  if (entries.length === 0) return badRequest('No settings provided');

  try {
    const applied = await withSchemaHeal(() => writeSettings(entries));

    invalidateSettingsCache();
    // The in-process cache is not the whole story: public pages are ISR-rendered,
    // so the route cache has to be invalidated too or the site keeps the old values.
    revalidateSettings();

    after(() =>
      logAudit({
        action: 'settings.update',
        entity: 'setting',
        actor: session,
        after: applied,
        request,
        meta: { keys: Object.keys(applied) },
      })
    );

    return ok({ success: true, updated: Object.keys(applied) });
  } catch (err) {
    logger.error('settings.update_failed', { err });
    return adminServerError('Could not save settings', err);
  }
}

/**
 * Writes the validated settings inside one transaction.
 *
 * This is where "Could not save settings" came from, and there were two separate
 * causes — both consequences of the live table being older than the code:
 *
 *  1. `settings.type` may not exist, or may be an ENUM that predates the `image` and
 *     `bool` members. Writing a value the ENUM does not list is errno 1265, not a
 *     warning, inside a transaction. The column list is therefore built from what the
 *     table actually has, and `withSchemaHeal` widens the ENUM on the first failure.
 *  2. The original statement was `INSERT … ON DUPLICATE KEY UPDATE`, which needs a
 *     unique key on `key` to do anything useful. Without one it appends a second row
 *     for every save, so the reader keeps returning whichever row it happens to find.
 *     Existing keys are now read once up front and updated in place.
 *
 * Kept as its own function so a heal-and-retry gets a fresh connection: DDL commits
 * implicitly in MySQL and must never run inside the transaction below.
 */
async function writeSettings(entries: [string, unknown][]): Promise<Record<string, string>> {
  const columns = await presentColumns('settings', ['key', 'value', 'type']);
  const hasType = columns.includes('type');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query('SELECT `key` FROM settings');
    const existing = new Set((existingRows as { key: string }[]).map((r) => r.key));

    const applied: Record<string, string> = {};

    for (const [key, rawValue] of entries) {
      const def = SETTING_DEF_BY_KEY.get(key);
      if (!def) continue; // unreachable — validation rejects unknown keys

      let value = rawValue === null ? '' : String(rawValue);
      // Free-text fields must not carry markup into the public header/footer.
      if (def.type === 'text' || def.type === 'textarea') {
        value = sanitizePlainText(value);
      }

      if (existing.has(key)) {
        await conn.execute(
          hasType
            ? 'UPDATE settings SET value = ?, type = ? WHERE `key` = ?'
            : 'UPDATE settings SET value = ? WHERE `key` = ?',
          hasType ? [value, toColumnType(def.type), key] : [value, key]
        );
      } else {
        await conn.execute(
          hasType
            ? 'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?)'
            : 'INSERT INTO settings (`key`, value) VALUES (?, ?)',
          hasType ? [key, value, toColumnType(def.type)] : [key, value]
        );
        existing.add(key);
      }

      applied[key] = value;
    }

    await conn.commit();
    return applied;
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}
