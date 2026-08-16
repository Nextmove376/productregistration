import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { updateUserSchema } from '@/lib/schemas';
import { sanitizePlainText } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import {
  badRequest,
  conflict,
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

async function countActiveAdmins(excludeId?: number): Promise<number> {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM admin_users
      WHERE role = 'admin' AND COALESCE(is_active, 1) = 1 ${excludeId ? 'AND id != ?' : ''}`,
    excludeId ? [excludeId] : []
  );
  return Number((rows as any[])[0]?.total ?? 0);
}

/**
 * Update a user.
 *
 * Partial: only the fields present in the request are written. Changing the
 * password or deactivating the account bumps `session_version`, which immediately
 * invalidates that user's existing JWTs (see `verifySession` in `lib/dal.ts`) rather
 * than leaving them signed in for up to seven days.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid user id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = updateUserSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  const [existingRows] = await pool.execute(
    `SELECT id, email, name, role, COALESCE(is_active, 1) AS is_active
       FROM admin_users WHERE id = ? LIMIT 1`,
    [id]
  );
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('User not found');

  /**
   * Don't allow the last active admin to be demoted or deactivated — that would
   * lock everyone out of the panel with no way back in except direct DB access.
   */
  const losingAdmin =
    (d.role !== undefined && d.role !== 'admin' && existing.role === 'admin') ||
    (d.is_active !== undefined && d.is_active === 0 && Number(existing.is_active) === 1 && existing.role === 'admin');

  if (losingAdmin && (await countActiveAdmins(id)) === 0) {
    return conflict('This is the last active admin. Promote another admin first.');
  }

  // Deactivating or changing a password must revoke live sessions.
  const bumpSession = d.password !== undefined || (d.is_active !== undefined && d.is_active === 0);

  const sets: string[] = [];
  const valuesList: any[] = [];

  if (d.name !== undefined) {
    sets.push('name = ?');
    valuesList.push(sanitizePlainText(d.name));
  }
  if (d.role !== undefined) {
    sets.push('role = ?');
    valuesList.push(d.role);
  }
  if (d.is_active !== undefined) {
    sets.push('is_active = ?');
    valuesList.push(d.is_active);
  }
  if (d.password !== undefined) {
    sets.push('password_hash = ?');
    valuesList.push(await hashPassword(d.password));
    // A password reset should also clear any lockout.
    sets.push('failed_attempts = 0', 'locked_until = NULL');
  }
  if (bumpSession) {
    sets.push('session_version = COALESCE(session_version, 0) + 1');
  }

  if (sets.length === 0) return badRequest('Nothing to update');

  try {
    valuesList.push(id);
    await pool.execute(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = ?`, valuesList);

    after(() =>
      logAudit({
        action: d.is_active === 0 ? 'user.deactivate' : 'user.update',
        entity: 'user',
        entityId: id,
        actor: session,
        before: { name: existing.name, role: existing.role, is_active: Number(existing.is_active) },
        after: {
          ...(d.name !== undefined && { name: d.name }),
          ...(d.role !== undefined && { role: d.role }),
          ...(d.is_active !== undefined && { is_active: d.is_active }),
          ...(d.password !== undefined && { password: '[changed]' }),
        },
        request,
      })
    );

    return ok({ success: true, id, sessionsRevoked: bumpSession });
  } catch (err) {
    logger.error('users.update_failed', { err, id });
    return serverError('Could not update the user', err);
  }
}

/** Clears a lockout without changing the password. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid user id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const action = (parsed.data as any)?.action;
  if (action !== 'unlock') return badRequest('Unsupported action');

  try {
    const [result] = await pool.execute(
      'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [id]
    );
    if (((result as any).affectedRows ?? 0) === 0) return notFound('User not found');

    after(() =>
      logAudit({ action: 'user.update', entity: 'user', entityId: id, actor: session, request, meta: { unlocked: true } })
    );

    return ok({ success: true, id });
  } catch (err) {
    logger.error('users.unlock_failed', { err, id });
    return serverError('Could not unlock the user', err);
  }
}

/**
 * Deactivates rather than deletes.
 *
 * A hard delete would orphan every `audit_log.user_id` reference, destroying the
 * trail of what that account did.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid user id');

  if (id === session.userId) {
    return conflict('You cannot deactivate your own account.');
  }

  const [existingRows] = await pool.execute(
    `SELECT id, email, name, role, COALESCE(is_active, 1) AS is_active FROM admin_users WHERE id = ? LIMIT 1`,
    [id]
  );
  const existing = (existingRows as any[])[0];
  if (!existing) return notFound('User not found');

  if (existing.role === 'admin' && (await countActiveAdmins(id)) === 0) {
    return conflict('This is the last active admin. Promote another admin first.');
  }

  try {
    await pool.execute(
      'UPDATE admin_users SET is_active = 0, session_version = COALESCE(session_version, 0) + 1 WHERE id = ?',
      [id]
    );

    after(() =>
      logAudit({
        action: 'user.deactivate',
        entity: 'user',
        entityId: id,
        actor: session,
        before: { email: existing.email, role: existing.role },
        request,
      })
    );

    return ok({ success: true, id });
  } catch (err) {
    logger.error('users.deactivate_failed', { err, id });
    return serverError('Could not deactivate the user', err);
  }
}
