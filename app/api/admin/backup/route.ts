import { after, type NextRequest } from 'next/server';
import { checkCsrf, rateLimit, requireAdmin } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { backupFilename, dumpToString, verifySql } from '@/lib/backup';
import { logger } from '@/lib/logger';
import {
  adminServerError,
  badRequest,
  csrfFailed,
  invalidJson,
  parseJsonBody,
  tooManyRequests,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Download a full logical database backup from the browser.
 *
 * The standing rule for this project is "create and verify a backup first", and until
 * now the only way to do that was `npm run db:backup` — which needs a terminal, a
 * local `.env`, and Hostinger's Remote MySQL switched on. On a host whose only
 * database tool is phpMyAdmin, that made the most important safety step the hardest
 * one to take, so in practice it was skipped.
 *
 * This is the same dump code (`lib/backup.ts`) reached from a button. One click, a
 * `.sql` file on your own machine, importable straight back through phpMyAdmin.
 *
 * Three deliberate constraints:
 *
 * - **`POST`, not `GET`.** The body of this response is every row in the database,
 *   including `submissions` — real names, emails and phone numbers. A `GET` is
 *   reachable from a bare `<a>` or an `<img src>` on any other site; requiring POST
 *   means `checkCsrf` applies and a cross-site page cannot trigger it.
 * - **Verified before it is sent.** A truncated backup looks perfectly fine until the
 *   day it is needed. `verifySql` runs server-side and a dump that fails it returns an
 *   error instead of a file — handing over a broken backup is worse than refusing one,
 *   because the broken one gets trusted.
 * - **Read-only.** Restore is not exposed here and should not be; it lives in the CLI
 *   where `DROP TABLE` needs an explicit `--yes`. See `lib/backup.ts`.
 */
export async function POST(request: NextRequest) {
  // Admin only, not editor: this returns the entire submissions table.
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  // A full dump is the most expensive query this app can run. Per-user, because the
  // point is to stop a stuck retry loop hammering the database, not to ration admins.
  const limit = rateLimit(`backup:${session.userId}`, 6, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const body = (parsed.data ?? {}) as { schemaOnly?: unknown; tables?: unknown };

  if (body.schemaOnly !== undefined && typeof body.schemaOnly !== 'boolean') {
    return badRequest('schemaOnly must be true or false.');
  }
  if (
    body.tables !== undefined &&
    (!Array.isArray(body.tables) || body.tables.some((t) => typeof t !== 'string'))
  ) {
    return badRequest('tables must be an array of table names.');
  }

  const schemaOnly = body.schemaOnly === true;
  const tables = (body.tables as string[] | undefined)?.filter(Boolean);

  try {
    const result = await dumpToString({ schemaOnly, tables });
    const check = verifySql(result.sql);

    if (!check.ok) {
      // Do not hand over a backup that cannot be restored. It would be trusted.
      logger.error('backup.verify_failed', { problems: check.problems });
      return adminServerError(
        `The backup was produced but failed its own integrity check, so it was not ` +
          `sent: ${check.problems.join('; ')}. Nothing was changed in the database.`,
        null
      );
    }

    const filename = backupFilename();

    logger.info('backup.downloaded', {
      tables: result.tables.length,
      rows: result.rows,
      bytes: result.bytes,
      schemaOnly,
    });

    after(() =>
      logAudit({
        action: 'db.backup',
        entity: 'database',
        actor: session,
        after: {
          filename,
          tables: result.tables,
          rows: result.rows,
          bytes: result.bytes,
          schemaOnly,
        },
        request,
      })
    );

    return new Response(result.sql, {
      status: 200,
      headers: {
        // `application/sql` makes browsers download rather than render it.
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Never let a proxy or the browser keep a copy of the whole database.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        // Read by the admin panel to show what it just handed you, since a download
        // gives the page itself no other way to report on the file.
        'X-Backup-Filename': filename,
        'X-Backup-Tables': String(result.tables.length),
        'X-Backup-Rows': String(result.rows),
        'X-Backup-Bytes': String(result.bytes),
        'X-Backup-Verified': 'yes',
      },
    });
  } catch (err) {
    logger.error('backup.failed', { err });
    return adminServerError('Could not create the backup', err);
  }
}
