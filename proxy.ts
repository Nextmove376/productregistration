import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/session';

/**
 * Edge guard for the admin area.
 *
 * In Next 16 the former `middleware` convention is named `proxy` and runs on
 * the Node runtime by default, so `jose` verification works here. This only
 * checks the signed session cookie — it never touches the database. Per-route
 * handlers still call requireAuth()/requireAdmin() for defence in depth.
 *
 *   - Unauthenticated `/admin/*` page requests  → redirect to /admin/login
 *   - An authenticated user hitting /admin/login → bounce to the dashboard
 *   - Unauthenticated admin API mutations        → 401 JSON
 *
 * The public write APIs (/api/contact, /api/enquiry, /api/track) are
 * intentionally excluded — they authenticate visitors by rate-limit + honeypot,
 * not by session.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  // Admin API routes: blog/team/settings writes require a session.
  const isAdminApi =
    pathname.startsWith('/api/blog') ||
    pathname.startsWith('/api/team') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/admin');

  if (isAdminApi) {
    // The login endpoint must stay reachable for unauthenticated visitors.
    const isLoginApi = pathname === '/api/admin/login';
    // GET is public for blog/team/settings (the site reads them); guard mutations.
    if (!isLoginApi && request.method !== 'GET' && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isLogin = pathname === '/admin/login';

  if (pathname.startsWith('/admin')) {
    if (!session && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    if (session && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/blog/:path*', '/api/team/:path*', '/api/settings/:path*', '/api/admin/:path*'],
};
