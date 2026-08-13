import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '7d';
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;

  // Total views and visitors
  const [statsRows] = await pool.execute(
    'SELECT COALESCE(SUM(views), 0) as total_views, COALESCE(SUM(visitors), 0) as total_visitors FROM daily_stats WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)',
    [days]
  );
  const stats = (statsRows as any[])[0];

  // Total submissions
  const [subRows] = await pool.execute(
    'SELECT COUNT(*) as total FROM submissions WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
    [days]
  );
  const submissions = (subRows as any[])[0].total;

  // Published posts count
  const [postRows] = await pool.execute("SELECT COUNT(*) as total FROM posts WHERE status = 'published'");
  const publishedPosts = (postRows as any[])[0].total;

  // Active services count
  const [svcRows] = await pool.execute('SELECT COUNT(*) as total FROM services WHERE is_active = 1');
  const activeServices = (svcRows as any[])[0].total;

  // Daily views for chart
  const [dailyRows] = await pool.execute(
    'SELECT date, SUM(views) as views, SUM(visitors) as visitors FROM daily_stats WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY date ORDER BY date',
    [days]
  );

  // Top pages
  const [topPages] = await pool.execute(
    'SELECT path, SUM(views) as views FROM daily_stats WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY path ORDER BY views DESC LIMIT 10',
    [days]
  );

  return NextResponse.json({
    stats: { totalViews: stats.total_views, totalVisitors: stats.total_visitors, submissions, publishedPosts, activeServices },
    daily: dailyRows,
    topPages,
  });
}
