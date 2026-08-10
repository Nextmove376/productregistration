import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for nightly maintenance tasks.
 *
 * Call from hPanel cron every 15 minutes:
 *   curl -s https://productregistrationinuae.com/api/cron?key=YOUR_CRON_SECRET
 *
 * Tasks:
 * 1. Publish scheduled posts whose published_at has arrived
 * 2. Roll up pageviews into daily_stats
 * 3. Prune raw pageviews older than 90 days
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  // Simple auth — must match CRON_SECRET env var
  if (!key || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, string> = {};

  // 1. Publish scheduled posts
  try {
    const scheduled = await query<{ id: number }>(
      `SELECT id FROM posts WHERE status = 'scheduled' AND published_at <= NOW()`
    );
    if (scheduled.length > 0) {
      await execute(
        `UPDATE posts SET status = 'published' WHERE status = 'scheduled' AND published_at <= NOW()`
      );
      results.publishScheduled = `${scheduled.length} posts published`;
    } else {
      results.publishScheduled = 'No scheduled posts to publish';
    }
  } catch (err) {
    results.publishScheduled = `Error: ${err instanceof Error ? err.message : 'unknown'}`;
  }

  // 2. Roll up pageviews into daily_stats
  try {
    // Get the last rollup date
    const lastRollup = await query<{ max_date: string | null }>(
      'SELECT MAX(stat_date) as max_date FROM daily_stats'
    );
    const startDate = lastRollup[0]?.max_date
      ? new Date(lastRollup[0].max_date)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Roll up from startDate to yesterday
    await execute(
      `INSERT INTO daily_stats (stat_date, path, country, views, visitors)
       SELECT
         DATE(created_at) as stat_date,
         path,
         COALESCE(country, '--') as country,
         COUNT(*) as views,
         COUNT(DISTINCT ip_hash) as visitors
       FROM pageviews
       WHERE DATE(created_at) > ? AND DATE(created_at) < CURDATE() AND is_bot = 0
       GROUP BY DATE(created_at), path, COALESCE(country, '--')
       ON DUPLICATE KEY UPDATE
         views = VALUES(views),
         visitors = VALUES(visitors)`,
      [startDate.toISOString().slice(0, 10)]
    );

    results.rollup = 'Daily stats rolled up successfully';
  } catch (err) {
    results.rollup = `Error: ${err instanceof Error ? err.message : 'unknown'}`;
  }

  // 3. Prune old pageviews (keep 90 days)
  try {
    const pruned = await execute(
      'DELETE FROM pageviews WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY) LIMIT 10000'
    );
    results.prune = `${pruned.affectedRows} old pageviews pruned`;
  } catch (err) {
    results.prune = `Error: ${err instanceof Error ? err.message : 'unknown'}`;
  }

  return NextResponse.json({ ok: true, results });
}
