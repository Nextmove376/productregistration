import { after, type NextRequest } from 'next/server';
import { checkCsrf, requireAdmin } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { clearSchemaCache } from '@/lib/schema';
import { inspect, repair, resetHealState } from '@/lib/schema-repair';
import { ensureServicesSeeded } from '@/lib/service-seed';
import { revalidateServices } from '@/lib/revalidate';
import { logger } from '@/lib/logger';
import {
  adminServerError,
  badRequest,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Schema diagnostics and repair.
 *
 * The four "Could not load …" screens all had the same cause — the live database was
 * created by an older version of this project and `CREATE TABLE IF NOT EXISTS` never
 * adds columns to a table that already exists — and the only way to find that out was
 * to read raw driver errors in a server log. That is what this endpoint replaces.
 *
 * `GET` reports the drift and runs the exact queries that were failing, so the panel
 * can name the cause. `POST` fixes it. Admin-only, because it runs DDL.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    return ok(await inspect());
  } catch (err) {
    logger.error('schema.inspect_failed', { err });
    return adminServerError('Could not inspect the database', err);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const action = (parsed.data as { action?: string } | null)?.action;

  try {
    if (action === 'repair') {
      const result = await repair();
      clearSchemaCache();
      // Let the automatic heal fire again later: the manual run may have been partial.
      resetHealState();

      logger.info('schema.repaired', { applied: result.applied.length, failed: result.failed.length });
      after(() =>
        logAudit({
          action: 'schema.repair',
          entity: 'schema',
          actor: session,
          after: { applied: result.applied, failed: result.failed },
          request,
        })
      );

      // A repaired schema usually means previously-unreadable rows are now readable.
      revalidateServices();
      return ok({ ...result, report: await inspect() });
    }

    if (action === 'seed-services') {
      const seeded = await ensureServicesSeeded();
      if (seeded.length > 0) revalidateServices();

      after(() =>
        logAudit({
          action: 'services.seed',
          entity: 'service',
          actor: session,
          after: { slugs: seeded },
          request,
        })
      );

      return ok({ seeded });
    }

    return badRequest('Unknown action. Expected "repair" or "seed-services".');
  } catch (err) {
    logger.error('schema.action_failed', { err, action });
    return adminServerError('The database action failed', err);
  }
}
