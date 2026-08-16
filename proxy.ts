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

/** Paths under /admin that must stay reachable without a session. */
const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Already signed in and heading for the login page — send them inward.
  if (isPublicAdminPath) {
    if (hasSession) {
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
