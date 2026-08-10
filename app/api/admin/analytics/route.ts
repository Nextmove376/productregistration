import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get('days')) || 30, 90);

  try {
    const [overview, topPages, countries, referrers, devices] = await Promise.all([
      // Overview stats
      query<{ views: number; visitors: number; submissions: number }>(`
        SELECT
          (SELECT COUNT(*) FROM pageviews WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)) as views,
          (SELECT COUNT(DISTINCT ip_hash) FROM pageviews WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)) as visitors,
          (SELECT COUNT(*) FROM submissions WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)) as submissions
      `, [days, days, days]),

      // Top pages
      query<{ path: string; views: number }>(`
        SELECT path, COUNT(*) as views
        FROM pageviews
        WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY) AND is_bot = 0
        GROUP BY path ORDER BY views DESC LIMIT 10
      `, [days]),

      // Countries
      query<{ country: string; views: number }>(`
        SELECT COALESCE(country, '--') as country, COUNT(*) as views
        FROM pageviews
        WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY) AND is_bot = 0
        GROUP BY country ORDER BY views DESC LIMIT 10
      `, [days]),

      // Referrers
      query<{ referrer_host: string; views: number }>(`
        SELECT COALESCE(referrer_host, 'Direct') as referrer_host, COUNT(*) as views
        FROM pageviews
        WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY) AND is_bot = 0
        GROUP BY referrer_host ORDER BY views DESC LIMIT 10
      `, [days]),

      // Devices
      query<{ device: string; views: number }>(`
        SELECT device, COUNT(*) as views
        FROM pageviews
        WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY) AND is_bot = 0
        GROUP BY device ORDER BY views DESC
      `, [days]),
    ]);

    // Daily chart data
    const daily = await query<{ date: string; views: number; visitors: number }>(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT ip_hash) as visitors
      FROM pageviews
      WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY) AND is_bot = 0
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);

    return NextResponse.json({
      overview: overview[0] || { views: 0, visitors: 0, submissions: 0 },
      topPages,
      countries,
      referrers,
      devices,
      daily,
    });
  } catch (err) {
    console.error('[analytics] query failed:', err);
    return NextResponse.json({
      overview: { views: 0, visitors: 0, submissions: 0 },
      topPages: [],
      countries: [],
      referrers: [],
      devices: [],
      daily: [],
    });
  }
}
