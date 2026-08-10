import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from './db';
import {
  SESSION_COOKIE as COOKIE,
  SESSION_MAX_AGE as MAX_AGE,
  signSession,
  verifySessionToken,
  type Session,
} from './session';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export type { Session };

type AdminRow = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  password_hash: string;
  failed_attempts: number;
  locked_until: Date | null;
};

/**
 * Verify credentials and issue a session cookie.
 * Locks the account for LOCK_MINUTES after MAX_FAILED consecutive failures.
 */
export async function login(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await queryOne<AdminRow>(
    'SELECT id, email, name, role, password_hash, failed_attempts, locked_until FROM admin_users WHERE email = ?',
    [email.toLowerCase().trim()]
  );

  // Always run a hash comparison so a missing user and a wrong password take
  // the same time — otherwise response timing leaks which emails exist.
  const hash = user?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = await bcrypt.compare(password, hash);

  if (!user) return { ok: false, error: 'Invalid email or password' };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { ok: false, error: 'Account temporarily locked. Try again shortly.' };
  }

  if (!valid) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_FAILED) {
      await execute(
        'UPDATE admin_users SET failed_attempts = 0, locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
        [LOCK_MINUTES, user.id]
      );
      return { ok: false, error: 'Too many attempts. Account locked for 15 minutes.' };
    }
    await execute('UPDATE admin_users SET failed_attempts = ? WHERE id = ?', [attempts, user.id]);
    return { ok: false, error: 'Invalid email or password' };
  }

  await execute(
    'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
    [user.id]
  );

  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });

  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

/** Read and verify the current session, or null. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return verifySessionToken(token);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}
