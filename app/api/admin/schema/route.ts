import { after, type NextRequest } from 'next/server';
import { checkCsrf, rateLimit, requireAdmin } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { clearSchemaCache } from '@/lib/schema';
import { inspect, repair, resetHealState } from '@/lib/schema-repair';
import { previewFinding, repairDatabaseMojibake, scanDatabaseMojibake } from '@/lib/mojibake-db';
import { ensureServicesSeeded } from '@/lib/service-seed';
import {
  revalidateBlog,
  revalidateServices,
  revalidateSettings,
  revalidateTeam,
} from '@/lib/revalidate';
import { logger } from '@/lib/logger';
import {
  adminServerError,
  badRequest,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  tooManyRequests,
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

    /*
     * Encoding repair, in two halves.
     *
     * `encoding-scan` reads and reports. `encoding-fix` re-runs that same scan
     * server-side and then applies it. The findings are deliberately NOT accepted from
     * the request body: a list of table/column/primary-key/new-value tuples supplied by
     * the client is an arbitrary-UPDATE primitive, and no admin screen needs that. The
     * browser chooses *whether* to repair, never *what* to write.
     *
     * The re-scan also means the preview cannot go stale — if content changed between
     * looking and clicking, the fix acts on what is in the database now.
     */
    if (action === 'encoding-scan' || action === 'encoding-fix') {
      // Reads every text column in every table, so it is the most expensive query on
      // this route. Bounded per-user to stop a stuck retry loop from hammering the
      // database. Not applied to `repair`/`seed-services`, whose cost is fixed.
      const limit = rateLimit(`encoding:${session.userId}`, 10, 10 * 60 * 1000);
      if (!limit.ok) return tooManyRequests(limit.retryAfter);
    }

    if (action === 'encoding-scan') {
      const scan = await scanDatabaseMojibake();
      return ok({
        total: scan.findings.length,
        skipped: scan.skipped,
        scanned: scan.scanned.length,
        // Previews only. Some of these columns hold whole post bodies.
        samples: scan.findings.slice(0, 25).map((f) => previewFinding(f)),
        tables: [...new Set(scan.findings.map((f) => f.table))],
      });
    }

    if (action === 'encoding-fix') {
      const scan = await scanDatabaseMojibake();
      if (scan.findings.length === 0) {
        return ok({ updated: 0, tables: [], samples: [], skipped: scan.skipped });
      }

      const tables = [...new Set(scan.findings.map((f) => f.table))];
      const samples = scan.findings.slice(0, 25).map((f) => previewFinding(f));
      const updated = await repairDatabaseMojibake(scan.findings);

      logger.info('encoding.repaired', { updated, tables });
      after(() =>
        logAudit({
          action: 'encoding.repair',
          entity: 'database',
          actor: session,
          after: { updated, tables, samples },
          request,
        })
      );

      // Repaired text is content, so every cached page that renders it is now stale.
      revalidateBlog();
      revalidateServices();
      revalidateTeam();
      revalidateSettings();

      return ok({ updated, tables, samples, skipped: scan.skipped });
    }

    return badRequest(
      'Unknown action. Expected "repair", "seed-services", "encoding-scan" or "encoding-fix".'
    );
  } catch (err) {
    logger.error('schema.action_failed', { err, action });
    return adminServerError('The database action failed', err);
  }
}
