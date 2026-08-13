import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const COOKIE_NAME = 'nm_session';
const EXPIRY = '7d';

export interface SessionPayload {
  userId: number;
  email: string;
  role: 'admin' | 'editor';
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function verifySession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function checkLockout(email: string): Promise<{ locked: boolean; remainingMs?: number }> {
  const [rows] = await pool.execute(
    'SELECT failed_attempts, locked_until FROM admin_users WHERE email = ?',
    [email]
  );
  const user = (rows as any[])[0];
  if (!user) return { locked: false };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { locked: true, remainingMs: new Date(user.locked_until).getTime() - Date.now() };
  }
  return { locked: false };
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const [rows] = await pool.execute(
    'SELECT failed_attempts FROM admin_users WHERE email = ?',
    [email]
  );
  const user = (rows as any[])[0];
  if (!user) return;

  const attempts = (user.failed_attempts || 0) + 1;
  if (attempts >= LOCKOUT_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await pool.execute(
      'UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE email = ?',
      [attempts, lockedUntil, email]
    );
  } else {
    await pool.execute(
      'UPDATE admin_users SET failed_attempts = ? WHERE email = ?',
      [attempts, email]
    );
  }
}

export async function resetFailedAttempts(email: string): Promise<void> {
  await pool.execute(
    'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE email = ?',
    [email]
  );
}
