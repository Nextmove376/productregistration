import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { clearCsrfCookie, generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

// Fail fast at module load rather than silently signing tokens with an empty key.
const RAW_SECRET = process.env.AUTH_SECRET;
if (!RAW_SECRET) {
  throw new Error('Missing required environment variable: AUTH_SECRET');
}
if (RAW_SECRET.length < 32) {
  throw new Error('AUTH_SECRET must be at least 32 characters');
}

const SECRET = new TextEncoder().encode(RAW_SECRET);
const ALG = 'HS256';
const COOKIE_NAME = 'nm_session';
const EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = 'admin' | 'editor';

export interface SessionPayload {
  userId: number;
  email: string;
  role: Role;
  /** Session version — bumped on password change / deactivation to revoke live sessions. */
  sv?: number;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_SECONDS}s`)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRY_SECONDS,
  });

  // Companion double-submit CSRF token (readable by client JS by design).
  await setCsrfCookie(generateCsrfToken());

  return token;
}

/**
 * Decodes and verifies the session cookie. Does NOT check the database —
 * use `verifySession()` from `lib/dal.ts` for a fully-validated session.
 */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    // Pin the algorithm: without this, jose accepts whatever the token header claims.
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });

    if (typeof payload.userId !== 'number' || typeof payload.email !== 'string') {
      return null;
    }
    if (payload.role !== 'admin' && payload.role !== 'editor') return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sv: typeof payload.sv === 'number' ? payload.sv : 0,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  await clearCsrfCookie();
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * A real bcrypt hash of a value nobody can guess. Compared against when the
 * submitted email doesn't exist, so a missing user costs the same wall-clock
 * time as a wrong password (defeats email enumeration by timing).
 */
const DUMMY_HASH = '$2b$12$6EPR8oGuybjsw1wKM65uOumJ0vx/rECNxT4alw4J9x33/xDZfBpkS';

export async function fakePasswordCompare(password: string): Promise<void> {
  try {
    await bcrypt.compare(password, DUMMY_HASH);
  } catch {
    /* ignore */
  }
}

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface LoginUserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  is_active: number;
  session_version: number;
  failed_attempts: number;
  locked_until: string | Date | null;
}

/** Single round trip for everything the login flow needs. */
export async function getUserForLogin(email: string): Promise<LoginUserRow | null> {
  const [rows] = await pool.execute(
    `SELECT id, email, password_hash, name, role,
            COALESCE(is_active, 1) AS is_active,
            COALESCE(session_version, 0) AS session_version,
            COALESCE(failed_attempts, 0) AS failed_attempts,
            locked_until
       FROM admin_users
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  return ((rows as LoginUserRow[])[0]) ?? null;
}

export function isLockedOut(user: Pick<LoginUserRow, 'locked_until'>): { locked: boolean; remainingMs: number } {
  if (!user.locked_until) return { locked: false, remainingMs: 0 };
  const until = new Date(user.locked_until).getTime();
  const remainingMs = until - Date.now();
  return remainingMs > 0 ? { locked: true, remainingMs } : { locked: false, remainingMs: 0 };
}

export async function checkLockout(email: string): Promise<{ locked: boolean; remainingMs?: number }> {
  const user = await getUserForLogin(email);
  if (!user) return { locked: false };
  const { locked, remainingMs } = isLockedOut(user);
  return locked ? { locked, remainingMs } : { locked: false };
}

/** One UPDATE: increments the counter and sets the lock in the same statement. */
export async function recordFailedAttempt(email: string): Promise<void> {
  await pool.execute(
    `UPDATE admin_users
        SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
            locked_until = IF(
              COALESCE(failed_attempts, 0) + 1 >= ?,
              DATE_ADD(NOW(), INTERVAL ? SECOND),
              locked_until
            )
      WHERE email = ?`,
    [LOCKOUT_ATTEMPTS, Math.floor(LOCKOUT_DURATION_MS / 1000), email]
  );
}

export async function resetFailedAttempts(email: string): Promise<void> {
  await pool.execute(
    'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE email = ?',
    [email]
  );
}

export { LOCKOUT_ATTEMPTS, LOCKOUT_DURATION_MS };
