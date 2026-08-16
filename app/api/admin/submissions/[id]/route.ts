import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { submissionUpdateSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import {
  badRequest,
  csrfFailed,
  invalidJson,
  notFound,
  ok,
  parseJsonBody,
  serverError,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor(request);
  if (error) return error;

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid submission id');

  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, company, service, message, source_page,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer,
            country, city, device, browser, status, notes, mail_status, mail_error, created_at
       FROM submissions
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  const sub = (rows as any[])[0];
  if (!sub) return notFound('Submission not found');
  return ok(sub);
}

/**
 * Partial update.
 *
 * This is the data-loss bug: the handler used to run
 * `UPDATE submissions SET status=?, notes=?` with `body.notes || null`, while the
 * admin UI's status dropdown sends only `{ status }`. Every status change
 * therefore wrote `notes = NULL` and silently destroyed whatever had been recorded
 * about that lead.
 *
 * Now only the fields actually present in the request are written.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid submission id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = submissionUpdateSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  const [existingRows] = await pool.execute(
    'SELECT id, status, notes FROM submissions WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('Submission not found');

  // Build the SET clause from present keys only.
  const sets: string[] = [];
  const values: any[] = [];

  if (d.status !== undefined) {
    sets.push('status = ?');
    values.push(d.status);
  }
  if (d.notes !== undefined) {
    sets.push('notes = ?');
    values.push(d.notes === null || d.notes === '' ? null : d.notes);
  }

  if (sets.length === 0) return badRequest('Nothing to update');

  try {
    values.push(id);
    await pool.execute(
      `UPDATE submissions SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    after(() =>
      logAudit({
        action: 'update',
        entity: 'submission',
        entityId: id,
        actor: session,
        before: { status: existing.status, notes: existing.notes },
        after: { ...(d.status !== undefined && { status: d.status }), ...(d.notes !== undefined && { notes: d.notes }) },
        request,
      })
    );

    const [updatedRows] = await pool.execute(
      'SELECT id, status, notes FROM submissions WHERE id = ? LIMIT 1',
      [id]
    );

    return ok({ success: true, submission: (updatedRows as any[])[0] });
  } catch (err) {
    logger.error('submission.update_failed', { err, id });
    return serverError('Could not update the submission', err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const purge = new URL(request.url).searchParams.get('purge') === 'true';

  const { session, error } = purge ? await requireAdmin(request) : await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid submission id');

  const [rows] = await pool.execute('SELECT id, name, email, status FROM submissions WHERE id = ? LIMIT 1', [id]);
  const sub = (rows as any[])[0];
  if (!sub) return notFound('Submission not found');

  try {
    if (purge) {
      await pool.execute('DELETE FROM submissions WHERE id = ?', [id]);
    } else {
      await pool.execute('UPDATE submissions SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    }

    after(() =>
      logAudit({
        action: purge ? 'purge' : 'delete',
        entity: 'submission',
        entityId: id,
        actor: session,
        before: { name: sub.name, status: sub.status },
        request,
      })
    );

    return ok({ success: true, id, purged: purge });
  } catch (err) {
    logger.error('submission.delete_failed', { err, id, purge });
    return serverError('Could not delete the submission', err);
  }
}
