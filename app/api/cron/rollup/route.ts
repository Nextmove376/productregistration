import { NextResponse, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { authorizeCron } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const RETENTION_DAYS = Number(process.env.PAGEVIEW_RETENTION_DAYS || 90);
/** Trash older than this is purged permanently. */
const TRASH_RETENTION_DAYS = Number(process.env.TRASH_RETENTION_DAYS || 30);

const SOFT_DELETE_TABLES = ['posts', 'services', 'team_members', 'media', 'submissions'] as const;

/**
 * Nightly analytics rollup and retention pruning.
 *
 * Two fixes over the previous version:
 * - It aggregated only *yesterday*, so a single missed run left a permanent hole
 *   in `daily_stats`. It now backfills a window (default 3 days), and re-running
 *   is safe because the upsert is keyed on (date, path, country).
 * - It counted bot traffic. `is_bot` was populated by the tracker but never used,
 *   so crawler hits inflated every number on the analytics page.
 */
export async function GET(request: NextRequest) {
  const auth = authorizeCron(request, 'rollup');
  if (!auth.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get('days'));
  const backfillDays = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.floor(rawDays), 90) : 3;

  try {
    // Rollup: excludes bots, keyed to allow safe re-runs.
    const [rollupResult] = await pool.execute(
      `INSERT INTO daily_stats (date, path, country, views, visitors)
       SELECT
         DATE(created_at) AS date,
         path,
         COALESCE(country, 'Unknown') AS country,
         COUNT(*) AS views,
         COUNT(DISTINCT session_id) AS visitors
       FROM pageviews
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND created_at < CURDATE()
         AND COALESCE(is_bot, 0) = 0
       GROUP BY DATE(created_at), path, COALESCE(country, 'Unknown')
       ON DUPLICATE KEY UPDATE views = VALUES(views), visitors = VALUES(visitors)`,
      [backfillDays]
    );

    const [pruneResult] = await pool.execute(
      'DELETE FROM pageviews WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [RETENTION_DAYS]
    );

    // Purge trash past its retention window.
    const purged: Record<string, number> = {};
    for (const table of SOFT_DELETE_TABLES) {
      try {
        const [res] = await pool.execute(
          `DELETE FROM \`${table}\` WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [TRASH_RETENTION_DAYS]
        );
        purged[table] = (res as any).affectedRows ?? 0;
      } catch (err) {
        // A foreign-key restriction on one table must not abort the whole job.
        logger.warn('cron.rollup.purge_failed', { err, table });
        purged[table] = -1;
      }
    }

    const summary = {
      success: true,
      backfillDays,
      rolledUp: (rollupResult as any).affectedRows ?? 0,
      pruned: (pruneResult as any).affectedRows ?? 0,
      purged,
      date: new Date().toISOString().split('T')[0],
    };

    logger.info('cron.rollup.completed', summary);
    return NextResponse.json(summary);
  } catch (err) {
    logger.error('cron.rollup.failed', { err });
    return NextResponse.json({ error: 'Rollup job failed' }, { status: 500 });
  }
}
