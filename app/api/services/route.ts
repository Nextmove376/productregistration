import pool from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, serverError } from '@/lib/http';

/**
 * Public services list. Active, non-deleted rows only.
 *
 * Note for admin screens: this route deliberately omits `is_active` and hides
 * inactive rows, so it must not be used to populate the admin list — use
 * `/api/admin/services`, which is authenticated and returns every row.
 */
export const revalidate = 300;

export async function GET() {
  try {
    const [rows] = await pool.execute(
      `SELECT id, slug, title, tag, summary, icon, hero_image, sort_order
         FROM services
        WHERE is_active = 1 AND deleted_at IS NULL
        ORDER BY sort_order, title`
    );
    return ok(rows);
  } catch (err) {
    logger.error('services.public_list_failed', { err });
    return serverError('Could not load services', err);
  }
}
