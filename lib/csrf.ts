import crypto from 'crypto';
import { cookies } from 'next/headers';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf-constants';

/**
 * Double-submit CSRF token.
 *
 * Why this exists alongside the `Origin`/`Sec-Fetch-Site` check in
 * `lib/api-auth.ts`: the header check is the right default, but it depends on the
 * hosting proxy preserving those headers. Losing them is very likely what
 * motivated the original `if (!origin && !referer) return true` bypass — which
 * disabled CSRF protection entirely rather than fixing the cause.
 *
 * The token is stored in a readable (non-httpOnly) cookie and echoed back in the
 * `x-csrf-token` header by `lib/client-api.ts`. An attacker on another origin
 * cannot read the cookie, so they cannot produce the matching header — and this
 * works regardless of what the proxy does to `Origin`.
 */

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
const TOKEN_BYTES = 32;

export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    // Deliberately readable by client JS — that is the point of double-submit.
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Verifies the `x-csrf-token` header against the `nm_csrf` cookie. */
export function verifyCsrfToken(request: Request): boolean {
  const header = request.headers.get(CSRF_HEADER_NAME);
  if (!header) return false;

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!match) return false;

  const cookieValue = decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1));
  if (!cookieValue || cookieValue.length < 16) return false;

  return timingSafeEqual(header, cookieValue);
}
