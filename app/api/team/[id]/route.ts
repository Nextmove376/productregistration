import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin, requireEditor } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateTeam } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { teamMemberSchema } from '@/lib/schemas';
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

/**
 * Single team member for the admin editor.
 *
 * Was an unauthenticated `SELECT *`, exposing phone/email/whatsapp for any id.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor(request);
  if (error) return error;

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid team member id');

  const [rows] = await pool.execute(
    `SELECT id, name, role, bio, linkedin, photo_url, phone, email, whatsapp,
            sort_order, is_active, created_at, updated_at
       FROM team_members
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  const member = (rows as any[])[0];
  if (!member) return notFound('Team member not found');
  return ok(member);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid team member id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = teamMemberSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  const [existingRows] = await pool.execute(
    'SELECT id, name, role FROM team_members WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('Team member not found');

  const name = sanitizePlainText(d.name);

  try {
    await pool.execute(
      `UPDATE team_members SET
          name=?, role=?, bio=?, linkedin=?, photo_url=?, phone=?, email=?, whatsapp=?,
          sort_order=?, is_active=?
        WHERE id=? AND deleted_at IS NULL`,
      [
        name,
        sanitizePlainText(d.role),
        sanitizePlainText(d.bio ?? ''),
        d.linkedin || null,
        d.photo_url ?? '',
        d.phone ?? '',
        d.email || null,
        d.whatsapp ?? '',
        d.sort_order ?? 0,
        d.is_active ?? 1,
        id,
      ]
    );

    revalidateTeam();

    after(() =>
      logAudit({
        action: 'update',
        entity: 'team_member',
        entityId: id,
        actor: session,
        before: { name: existing.name, role: existing.role },
        after: { name, role: d.role },
        request,
      })
    );

    return ok({ success: true, id });
  } catch (err) {
    logger.error('team.update_failed', { err, id });
    return serverError('Could not update the team member', err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const purge = new URL(request.url).searchParams.get('purge') === 'true';

  const { session, error } = purge ? await requireAdmin(request) : await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid team member id');

  const [rows] = await pool.execute('SELECT id, name, role FROM team_members WHERE id = ? LIMIT 1', [id]);
  const member = (rows as any[])[0];
  if (!member) return notFound('Team member not found');

  try {
    if (purge) {
      await pool.execute('DELETE FROM team_members WHERE id = ?', [id]);
    } else {
      await pool.execute('UPDATE team_members SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    }

    revalidateTeam();

    after(() =>
      logAudit({
        action: purge ? 'purge' : 'delete',
        entity: 'team_member',
        entityId: id,
        actor: session,
        before: { name: member.name, role: member.role },
        request,
      })
    );

    return ok({ success: true, id, purged: purge });
  } catch (err) {
    logger.error('team.delete_failed', { err, id, purge });
    return serverError('Could not delete the team member', err);
  }
}
