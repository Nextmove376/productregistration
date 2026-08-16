import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import type { Role, SessionPayload } from '@/lib/auth';
import { forbidden, unauthorized } from '@/lib/http';
import { verifyCsrfToken } from '@/lib/csrf';

interface AuthResult {
  session: SessionPayload;
  error?: NextResponse;
}

/** Any signed-in admin user (admin or editor). */
export async function requireAuth(_request?: NextRequest): Promise<AuthResult> {
  const session = await verifySession();
  if (!session) {
    return { session: null as unknown as SessionPayload, error: unauthorized() };
  }
  return { session };
}

/** Content routes: both roles may write. */
export async function requireEditor(_request?: NextRequest): Promise<AuthResult> {
  const session = await verifySession();
  if (!session) {
    return { session: null as unknown as SessionPayload, error: unauthorized() };
  }
  if (session.role !== 'admin' && session.role !== 'editor') {
    return { session, error: forbidden() };
  }
  return { session };
}

/** Privileged routes: users, settings, audit, purge. */
export async function requireAdmin(_request?: NextRequest): Promise<AuthResult> {
  const session = await verifySession();
  if (!session) {
    return { session: null as unknown as SessionPayload, error: unauthorized() };
  }
  if (session.role !== 'admin') {
    return { session, error: forbidden() };
  }
  return { session };
}

export async function requireRoles(...roles: Role[]): Promise<AuthResult> {
  const session = await verifySession();
  if (!session) {
    return { session: null as unknown as SessionPayload, error: unauthorized() };
  }
  if (!roles.includes(session.role)) {
    return { session, error: forbidden() };
  }
  return { session };
}

/* ------------------------------------------------------------------ *
 * CSRF
 * ------------------------------------------------------------------ */

function allowedHosts(request: NextRequest): Set<string> {
  const hosts = new Set<string>();

  // Behind Hostinger's reverse proxy the forwarded host is the public one.
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) forwardedHost.split(',').forEach((h) => hosts.add(h.trim().toLowerCase()));

  const host = request.headers.get('host');
  if (host) hosts.add(host.trim().toLowerCase());

  for (const envUrl of [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!envUrl) continue;
    try {
      hosts.add(new URL(envUrl).host.toLowerCase());
    } catch {
      /* ignore malformed config */
    }
  }

  hosts.delete('');
  return hosts;
}

function hostMatches(candidate: string, request: NextRequest): boolean {
  try {
    return allowedHosts(request).has(new URL(candidate).host.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Same-origin check for state-changing requests.
 *
 * This previously contained `if (!origin && !referer) return true`, which meant
 * any client that simply omitted both headers — i.e. every non-browser client —
 * passed the check. The bypass is gone. A request must now positively prove it is
 * same-origin by one of:
 *
 *   1. a valid double-submit CSRF token (`lib/csrf.ts`) — works even if the host's
 *      reverse proxy strips `Origin`/`Sec-Fetch-Site`;
 *   2. `Sec-Fetch-Site: same-origin`;
 *   3. an `Origin` or `Referer` whose host is one of ours.
 */
export function checkCsrf(request: NextRequest): boolean {
  // 1. Strongest signal, and independent of proxy header handling.
  if (verifyCsrfToken(request)) return true;

  // 2. Set by every modern browser and not forgeable by page JavaScript.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    if (fetchSite === 'same-origin' || fetchSite === 'none') return true;
    // 'cross-site' / 'same-site' on a state-changing request is not acceptable.
    return false;
  }

  // 3. Fall back to origin comparison.
  const origin = request.headers.get('origin');
  if (origin) return origin === 'null' ? false : hostMatches(origin, request);

  const referer = request.headers.get('referer');
  if (referer) return hostMatches(referer, request);

  // No proof of origin at all — reject.
  return false;
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 * ------------------------------------------------------------------ */

interface RateEntry {
  count: number;
  resetAt: number;
}

/**
 * In-process limiter. Adequate for this deployment (single Node process on
 * Hostinger shared hosting) but it must stay bounded: the previous version never
 * evicted anything, so the map grew for the lifetime of the process.
 */
const rateLimitMap = new Map<string, RateEntry>();
const MAX_TRACKED_KEYS = 10_000;
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
  // Hard ceiling in case of a flood of unique keys between sweeps.
  if (rateLimitMap.size > MAX_TRACKED_KEYS) {
    const excess = rateLimitMap.size - MAX_TRACKED_KEYS;
    let removed = 0;
    for (const key of rateLimitMap.keys()) {
      rateLimitMap.delete(key);
      if (++removed >= excess) break;
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — send as `Retry-After`. */
  retryAfter: number;
  remaining: number;
}

export function rateLimit(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000), remaining: 0 };
  }

  entry.count++;
  return { ok: true, retryAfter: 0, remaining: maxAttempts - entry.count };
}

/** Boolean form kept for existing call sites. */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  return rateLimit(key, maxAttempts, windowMs).ok;
}

/** Clears a key early, e.g. after a successful login. */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}
