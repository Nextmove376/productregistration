'use client';

import HeaderNav from '@/components/layout/HeaderNav';
import { useNav } from '@/components/layout/NavProvider';

/**
 * Site header.
 *
 * Deliberately a client component with no props and no data access of its own. It is
 * imported by ten call sites, one of which (`app/contact/page.tsx`) is itself a client
 * component — so anything server-only reachable from here ends up in the browser bundle.
 * That is exactly what failed the build when this file imported `lib/nav` directly:
 * `mysql2` needs `net`/`tls`.
 *
 * The nav contents are read once in `app/layout.tsx` and published through
 * `NavProvider`, which keeps the signature empty and every call site untouched.
 */
export default function Header() {
  const { services, team } = useNav();
  return <HeaderNav services={services} team={team} />;
}
