import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Aggregate yesterday's pageviews into daily_stats
  await pool.execute(`
    INSERT INTO daily_stats (date, path, country, views, visitors)
    SELECT
      DATE(created_at) as date,
      path,
      COALESCE(country, 'Unknown') as country,
      COUNT(*) as views,
      COUNT(DISTINCT session_id) as visitors
    FROM pageviews
    WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    GROUP BY DATE(created_at), path, COALESCE(country, 'Unknown')
    ON DUPLICATE KEY UPDATE views = VALUES(views), visitors = VALUES(visitors)
  `);

  // Prune pageviews older than 90 days
  const [result] = await pool.execute('DELETE FROM pageviews WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');

  return NextResponse.json({
    success: true,
    pruned: (result as any).affectedRows,
    date: new Date().toISOString().split('T')[0],
  });
}
