import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy — Next.js 16's replacement for `middleware.ts` (same functionality,
 * renamed in v16.0.0). This project previously had neither, so every `/admin`
 * route was reachable without a session.
 *
 * This is an **optimistic check only**. It looks for the presence of the session
 * cookie and nothing more: no JWT verification, no database lookup. Per the
 * Next.js authentication guide, Proxy must not be used as a full authorization
 * solution — it runs on every matched request and should stay fast.
 *
 * The real gate is `requireSession()` from `lib/dal.ts`, called in each admin
 * page and API route, which verifies the signature and re-checks the user row.
 * Deleting this file would not open a hole; it just means unauthenticated users
 * reach the page before being redirected.
 *
 * Note: the Node.js runtime is the default in v16, and exporting a `runtime`
 * config from this file throws — so there is no runtime export here.
 */

const SESSION_COOKIE = 'nm_session';

/** Page paths under /admin that must stay reachable without a session. */
const PUBLIC_ADMIN_PAGES = ['/admin/login'];

/**
 * API paths that must never be gated, and must never be redirected.
 *
 * `/api/admin/login` is the critical one: it matches the `/api/admin/:path*`
 * matcher below, and by definition there is no session cookie yet when it is
 * called — so gating it returned a 401 before the handler ever ran and made
 * signing in impossible. `/api/admin/logout` is here so a stale or malformed
 * cookie can always be cleared.
 *
 * These are checked before `hasSession` on purpose. Sending a redirect for an
 * API path would turn the login POST into a GET of the dashboard, which fails
 * just as silently as the 401 did.
 */
const PUBLIC_ADMIN_APIS = ['/api/admin/login', '/api/admin/logout'];

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  if (PUBLIC_ADMIN_APIS.includes(pathname)) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isPublicAdminPage = PUBLIC_ADMIN_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isPublicAdminPage) {
    // Already signed in and heading for the login page — send them inward.
    //
    // Skipped when `?next=` is present. That parameter means `requireSession()`
    // just rejected this cookie and bounced the user here, so the cookie exists
    // but is invalid (expired, wrong session_version, deactivated user). Without
    // this guard the optimistic redirect would send them back to the page that
    // rejected them, and the two would bounce forever.
    if (hasSession && !searchParams.has('next')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (hasSession) return NextResponse.next();

  // API routes get a JSON 401 rather than an HTML redirect, so the admin client
  // always has something parseable to show.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
