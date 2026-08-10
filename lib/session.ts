import { SignJWT, jwtVerify } from 'jose';

/**
 * Runtime-agnostic session token helpers.
 *
 * This module deliberately avoids `next/headers` and `mysql2` so it can be
 * imported from both server components (via lib/auth) and `proxy.ts`, which
 * runs before the request reaches the app and cannot touch the DB pool.
 */

export const SESSION_COOKIE = 'nm_session';
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export type Session = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
};

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters');
  }
  return new TextEncoder().encode(s);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

/** Verify a token and return the session, or null if it's absent/invalid/expired. */
export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.id as number,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'editor',
    };
  } catch {
    return null;
  }
}
