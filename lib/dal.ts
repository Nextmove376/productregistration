import { cache } from 'react';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import { readSessionCookie, type Role, type SessionPayload } from '@/lib/auth';

/**
 * Data Access Layer.
 *
 * `verifySession` is the single source of truth for "who is making this request".
 * It is wrapped in React `cache()` so that a render pass which needs the session
 * in both `generateMetadata` and the page body only pays for one cookie decode
 * and one user lookup.
 *
 * Unlike the raw cookie check in `lib/auth.ts`, this re-reads the user row on
 * every request, so deactivating a user or bumping their `session_version`
 * revokes live sessions immediately instead of waiting out the 7-day JWT.
 */
export const verifySession = cache(async (): Promise<SessionPayload | null> => {
  const payload = await readSessionCookie();
  if (!payload) return null;

  try {
    const [rows] = await pool.execute(
      `SELECT id, email, role,
              COALESCE(is_active, 1) AS is_active,
              COALESCE(session_version, 0) AS session_version
         FROM admin_users
        WHERE id = ?
        LIMIT 1`,
      [payload.userId]
    );
    const user = (rows as any[])[0];

    if (!user) return null;
    if (Number(user.is_active) !== 1) return null;
    if (Number(user.session_version) !== Number(payload.sv ?? 0)) return null;

    // Trust the database over the token for role/email — a role change takes
    // effect on the next request rather than the next login.
    return {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      sv: Number(user.session_version),
    };
  } catch {
    // A database blip must not be mistaken for a valid session.
    return null;
  }
});

/** For Server Components / pages. Redirects to login when unauthenticated. */
export async function requireSession(nextPath?: string): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) {
    const target = nextPath ? `/admin/login?next=${encodeURIComponent(nextPath)}` : '/admin/login';
    redirect(target);
  }
  return session;
}

/** For Server Components / pages that need a specific role. */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect('/admin/dashboard?error=forbidden');
  }
  return session;
}

/** Convenience: content sections are editable by both roles. */
export function requireEditor() {
  return requireRole('admin', 'editor');
}

/** Convenience: users, settings, audit and purge are admin-only. */
export function requireAdminRole() {
  return requireRole('admin');
}
