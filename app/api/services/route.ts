import pool from '@/lib/db';
import { selectList, softDeleteFilter, hasColumn } from '@/lib/schema';
import { withSchemaHeal } from '@/lib/schema-repair';
import { logger } from '@/lib/logger';
import { ok, serverError } from '@/lib/http';

/**
 * Public services list. Active, non-deleted rows only.
 *
 * Note for admin screens: this route deliberately omits `is_active` and hides
 * inactive rows, so it must not be used to populate the admin list — use
 * `/api/admin/services`, which is authenticated and returns every row.
 *
 * The column list is resolved against the live table rather than hard-coded. The
 * production database predates `hero_image` and `deleted_at`, and naming a column that
 * does not exist made this route 500 as a whole — taking the header navigation with it.
 */
export const revalidate = 300;

export async function GET() {
  try {
    const rows = await withSchemaHeal(async () => {
      const columns = await selectList('services', [
        'id', 'slug', 'title', 'tag', 'summary', 'icon', 'hero_image', 'sort_order',
      ]);
      const notDeleted = await softDeleteFilter('services');
      const activeOnly = (await hasColumn('services', 'is_active')) ? ' AND is_active = 1' : '';

      const [result] = await pool.query(
        `SELECT ${columns} FROM services
          WHERE 1=1${activeOnly}${notDeleted}
          ORDER BY sort_order, title`
      );
      return result;
    });

    return ok(rows);
  } catch (err) {
    logger.error('services.public_list_failed', { err });
    return serverError('Could not load services', err);
  }
}
