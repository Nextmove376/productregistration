'use client';

import { createContext, useContext } from 'react';
import type { NavChild } from '@/lib/nav';

/**
 * Carries the header's dropdown contents from the root layout to `<Header />`.
 *
 * `<Header />` cannot fetch its own data. Making it an async server component that
 * imports `lib/nav` broke the build: `app/contact/page.tsx` is a client component, and a
 * client component importing `Header` drags `lib/nav` → `lib/db` → `mysql2` into the
 * browser bundle, where `net` and `tls` do not exist. Passing the data down as props
 * instead would mean touching all ten `<Header />` call sites and threading it through
 * `ServicePageLayout`.
 *
 * So the root layout — a server component, and the one ancestor every page shares —
 * reads the nav once and publishes it here. `Header` stays prop-less and client-safe, and
 * the queries run once per render pass rather than once per page.
 */
export interface NavData {
  services: NavChild[];
  team: NavChild[];
}

const EMPTY: NavData = { services: [], team: [] };

const NavContext = createContext<NavData>(EMPTY);

export function NavProvider({ value, children }: { value: NavData; children: React.ReactNode }) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

/**
 * Returns empty lists rather than throwing when no provider is present, so a stray
 * `<Header />` outside the root layout renders a reduced menu instead of a crash.
 */
export function useNav(): NavData {
  return useContext(NavContext);
}
