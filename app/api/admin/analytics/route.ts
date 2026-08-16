import { type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireEditor } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { ok, serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Analytics summary.
 *
 * The previous version read only `daily_stats`, so device, browser, OS, referrer
 * and country breakdowns were unavailable even though `pageviews` has all of those
 * columns. Rollup data is used for the long-range totals and per-day series (it is
 * pre-aggregated and cheap), while the dimension breakdowns come from the raw
 * `pageviews` table with bots excluded.
 */
const RANGES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

export async function GET(request: NextRequest) {
  const { error } = await requireEditor(request);
  if (error) return error;

  const url = new URL(request.url);
  const rangeKey = url.searchParams.get('range') || '7d';
  const days = RANGES[rangeKey] ?? 7;

  try {
    const [
      statsRows,
      prevStatsRows,
      subRows,
      prevSubRows,
      postRows,
      svcRows,
      dailyRows,
      topPagesRows,
      deviceRows,
      browserRows,
      osRows,
      referrerRows,
      countryRows,
      topPostsRows,
    ] = await Promise.all([
      pool.execute(
        `SELECT COALESCE(SUM(views), 0) AS total_views, COALESCE(SUM(visitors), 0) AS total_visitors
           FROM daily_stats WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
        [days]
      ),
      // Previous equivalent window, so the UI can show a delta rather than a bare number.
      pool.execute(
        `SELECT COALESCE(SUM(views), 0) AS total_views, COALESCE(SUM(visitors), 0) AS total_visitors
           FROM daily_stats
          WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND date < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
        [days * 2, days]
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM submissions
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND deleted_at IS NULL`,
        [days]
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM submissions
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            AND deleted_at IS NULL`,
        [days * 2, days]
      ),
      pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'published' AND deleted_at IS NULL"),
      pool.execute('SELECT COUNT(*) AS total FROM services WHERE is_active = 1 AND deleted_at IS NULL'),
      pool.execute(
        `SELECT date, SUM(views) AS views, SUM(visitors) AS visitors
           FROM daily_stats WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY date ORDER BY date`,
        [days]
      ),
      pool.execute(
        `SELECT path, SUM(views) AS views FROM daily_stats
          WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY path ORDER BY views DESC LIMIT 10`,
        [days]
      ),
      dimension('device', days),
      dimension('browser', days),
      dimension('os', days),
      pool.execute(
        `SELECT COALESCE(NULLIF(referrer_host, ''), 'Direct') AS label, COUNT(*) AS value
           FROM pageviews
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND COALESCE(is_bot, 0) = 0
          GROUP BY label ORDER BY value DESC LIMIT 10`,
        [days]
      ),
      pool.execute(
        `SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS label, SUM(views) AS value
           FROM daily_stats
          WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY label ORDER BY value DESC LIMIT 10`,
        [days]
      ),
      pool.execute(
        `SELECT slug, title, views FROM posts
          WHERE status = 'published' AND deleted_at IS NULL
          ORDER BY views DESC LIMIT 5`
      ),
    ]);

    const first = (r: unknown) => (r as any[])[0]?.[0] ?? {};
    const rows = (r: unknown) => ((r as any[])[0] ?? []) as any[];

    const stats = first(statsRows);
    const prevStats = first(prevStatsRows);

    return ok({
      range: rangeKey,
      days,
      stats: {
        totalViews: Number(stats.total_views ?? 0),
        totalVisitors: Number(stats.total_visitors ?? 0),
        submissions: Number(first(subRows).total ?? 0),
        publishedPosts: Number(first(postRows).total ?? 0),
        // Was computed but never rendered.
        activeServices: Number(first(svcRows).total ?? 0),
      },
      previous: {
        totalViews: Number(prevStats.total_views ?? 0),
        totalVisitors: Number(prevStats.total_visitors ?? 0),
        submissions: Number(first(prevSubRows).total ?? 0),
      },
      daily: rows(dailyRows).map((d) => ({
        date: d.date,
        views: Number(d.views ?? 0),
        visitors: Number(d.visitors ?? 0),
      })),
      topPages: rows(topPagesRows).map((p) => ({ path: p.path, views: Number(p.views ?? 0) })),
      topPosts: rows(topPostsRows).map((p) => ({ slug: p.slug, title: p.title, views: Number(p.views ?? 0) })),
      breakdowns: {
        device: normalise(rows(deviceRows)),
        browser: normalise(rows(browserRows)),
        os: normalise(rows(osRows)),
        referrer: normalise(rows(referrerRows)),
        country: normalise(rows(countryRows)),
      },
    });
  } catch (err) {
    logger.error('analytics.query_failed', { err, range: rangeKey });
    return serverError('Could not load analytics', err);
  }
}

/**
 * Groups raw pageviews by one dimension column.
 *
 * The column name is interpolated, so it is restricted to a hard-coded allow-list
 * — it can never come from the request.
 */
function dimension(column: 'device' | 'browser' | 'os', days: number) {
  const allowed = { device: 'device', browser: 'browser', os: 'os' } as const;
  const col = allowed[column];
  return pool.execute(
    `SELECT COALESCE(NULLIF(\`${col}\`, ''), 'Unknown') AS label, COUNT(*) AS value
       FROM pageviews
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND COALESCE(is_bot, 0) = 0
      GROUP BY label ORDER BY value DESC LIMIT 10`,
    [days]
  );
}

function normalise(rows: any[]): { label: string; value: number }[] {
  return rows.map((r) => ({ label: String(r.label ?? 'Unknown'), value: Number(r.value ?? 0) }));
}
