import { type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireEditor } from '@/lib/api-auth';
import { getEnumParam, getPagination, getSearch, paginatedResponse } from '@/lib/query-params';
import { SUBMISSION_STATUSES } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import { ok, serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Submissions list.
 *
 * Adds search and a correct `totalPages`, and excludes trashed rows. The client
 * previously requested this endpoint with no parameters (defaulting to the first 20
 * rows) and then filtered by status in the browser — so once there were more than 20
 * leads, the status tabs showed a misleading subset and the counts were wrong.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireEditor(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const pagination = getPagination(searchParams, { defaultLimit: 20, maxLimit: 100 });
    const status = getEnumParam(searchParams, 'status', SUBMISSION_STATUSES);
    const search = getSearch(searchParams, 'q') || getSearch(searchParams, 'search');

    const where: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    if (search) {
      where.push('(name LIKE ? OR email LIKE ? OR company LIKE ? OR service LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM submissions ${whereSql}`, params);
    const total = Number((countRows as any[])[0]?.total ?? 0);

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, company, service, message, source_page,
              utm_source, utm_medium, utm_campaign, referrer, country, city, device, browser,
              status, notes, mail_status, mail_error, created_at
         FROM submissions ${whereSql}
        ORDER BY created_at DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
      params
    );

    // Per-status counts so the tabs can show totals across the whole table.
    const [statusRows] = await pool.execute(
      'SELECT status, COUNT(*) AS total FROM submissions WHERE deleted_at IS NULL GROUP BY status'
    );
    const counts: Record<string, number> = {};
    for (const row of statusRows as any[]) counts[row.status] = Number(row.total);

    return ok({ ...paginatedResponse(rows as unknown[], total, pagination), counts });
  } catch (err) {
    logger.error('submissions.list_failed', { err });
    return serverError('Could not load submissions', err);
  }
}
