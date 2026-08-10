import { NextResponse } from 'next/server';
import { getSession, type Session } from './auth';

/**
 * Guard for mutating API routes. Returns an error response when the caller
 * is unauthenticated, or when the request looks cross-origin (CSRF).
 */
export async function requireAuth(
  request?: Request
): Promise<{ session: Session; error?: undefined } | { session: null; error: NextResponse }> {
  if (request && !sameOrigin(request)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 }),
    };
  }

  const session = await getSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session };
}

/** Admin-only guard, for destructive or settings-level operations. */
export async function requireAdmin(request?: Request) {
  const result = await requireAuth(request);
  if (result.error) return result;
  if (result.session.role !== 'admin') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Admin role required' }, { status: 403 }),
    };
  }
  return result;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  // Same-origin non-CORS requests may omit Origin entirely; those are safe.
  if (!origin) return true;

  const host = request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// In-process rate limiter.
//
// Hostinger Business runs a single Node process, so a Map is sufficient and
// avoids a Redis dependency. Entries are evicted lazily on read plus by a
// size cap, so memory stays bounded without a timer.
// ---------------------------------------------------------------------------

const HITS = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 5000;

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = HITS.get(key);

  if (!entry || entry.resetAt <= now) {
    if (HITS.size >= MAX_KEYS) {
      for (const [k, v] of HITS) if (v.resetAt <= now) HITS.delete(k);
      if (HITS.size >= MAX_KEYS) HITS.clear();
    }
    HITS.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
