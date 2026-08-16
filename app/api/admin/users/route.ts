import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireAdmin } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createUserSchema } from '@/lib/schemas';
import { sanitizePlainText } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import {
  conflict,
  created,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  serverError,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Admin user management.
 *
 * There was no users module at all: the only way to create an admin was to run
 * `scripts/create-admin.ts` on the server, and the `editor` role in the
 * `admin_users.role` ENUM was unusable because every route demanded
 * `role === 'admin'`. Content routes now accept both roles (see `requireEditor`),
 * and this screen is what makes `editor` assignable.
 *
 * Password hashes are never selected, so they cannot leak through this endpoint.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const [rows] = await pool.execute(
      `SELECT id, email, name, role,
              COALESCE(is_active, 1) AS is_active,
              last_login_at, failed_attempts, locked_until, created_at
         FROM admin_users
        ORDER BY created_at DESC`
    );

    const now = Date.now();
    const users = (rows as any[]).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      is_active: Number(u.is_active) === 1,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      // Derived so the UI can offer an Unlock action.
      locked: Boolean(u.locked_until && new Date(u.locked_until).getTime() > now),
      locked_until: u.locked_until,
      failed_attempts: Number(u.failed_attempts ?? 0),
    }));

    return ok(users);
  } catch (err) {
    logger.error('users.list_failed', { err });
    return serverError('Could not load users', err);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = createUserSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;
  const email = d.email.trim().toLowerCase();
  const name = sanitizePlainText(d.name);

  try {
    const passwordHash = await hashPassword(d.password);

    const [result] = await pool.execute(
      `INSERT INTO admin_users (email, password_hash, name, role, is_active, session_version)
       VALUES (?, ?, ?, ?, 1, 0)`,
      [email, passwordHash, name, d.role]
    );

    const id = (result as any).insertId as number;

    after(() =>
      logAudit({
        action: 'user.create',
        entity: 'user',
        entityId: id,
        actor: session,
        // Deliberately excludes the password and its hash.
        after: { email, name, role: d.role },
        request,
      })
    );

    logger.info('user.created', { id, email, role: d.role, by: session.email });

    return created({ id, email, name, role: d.role });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return conflict('A user with that email already exists.', { field: 'email' });
    }
    logger.error('users.create_failed', { err });
    return serverError('Could not create the user', err);
  }
}
