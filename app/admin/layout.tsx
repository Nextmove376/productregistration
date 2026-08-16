import type { Metadata } from 'next';

/**
 * Root layout for the whole /admin area.
 *
 * Deliberately a pass-through with no chrome and no auth check. The
 * authenticated shell (sidebar + session gate) lives in
 * `app/admin/(protected)/layout.tsx`.
 *
 * Why the split: nested layouts compose, so when the login page lived under a
 * layout that rendered the sidebar, the sidebar appeared on the login screen and
 * no child layout could opt out. The `(protected)` route group lets the login
 * page sit outside the authenticated shell without changing any URL.
 */
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · NextMove Admin' },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
