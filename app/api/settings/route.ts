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
import { logger } from '@/lib/logger';
import {
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const applied: Record<string, string> = {};

    for (const [key, rawValue] of entries) {
      const def = SETTING_DEF_BY_KEY.get(key);
      if (!def) continue; // unreachable — validation rejects unknown keys

      let value = rawValue === null ? '' : String(rawValue);
      // Free-text fields must not carry markup into the public header/footer.
      if (def.type === 'text' || def.type === 'textarea') {
        value = sanitizePlainText(value);
      }

      await conn.execute(
        'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), type = VALUES(type)',
        [key, value, toColumnType(def.type)]
      );
      applied[key] = value;
    }

    await conn.commit();

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
    await conn.rollback();
    logger.error('settings.update_failed', { err });
    return serverError('Could not save settings', err);
  } finally {
    conn.release();
  }
}
