'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import type { NavChild } from '@/lib/nav';

interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
}

export interface HeaderNavProps {
  services: NavChild[];
  team: NavChild[];
}

/**
 * Site header.
 *
 * Previously a flat list of six links, which left the single-service pages reachable
 * only via `/services` and meant a service added in the admin panel never appeared in
 * the navigation. Services and Team are now dropdowns fed from the database, so the menu
 * tracks the content rather than being maintained by hand.
 *
 * Hover alone is not enough for the dropdowns — that excludes touch and keyboard — so
 * each parent is a real button that toggles on click and on focus, closes on Escape and
 * on outside click, and opens on hover as a convenience for pointer users.
 */
export default function HeaderNav({ services, team }: HeaderNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const items: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services', children: services },
    { label: 'About', href: '/about' },
    { label: 'Team', href: '/team', children: team.length > 0 ? team : undefined },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ];

  // A navigation must close the menus it was opened from.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSection(null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const openNow = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };

  // A short grace period so moving the pointer from the label into the panel — across
  // the gap between them — does not close it.
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="Nextmove Services" className="h-10 w-auto" />
        </Link>

        <nav ref={navRef} className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          {items.map((item) =>
            item.children && item.children.length > 0 ? (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => openNow(item.label)}
                onMouseLeave={closeSoon}
              >
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={`rounded-full px-3 py-2 font-medium transition-colors hover:text-foreground ${
                      isActive(item.href) ? 'text-foreground' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    aria-expanded={openMenu === item.label}
                    aria-haspopup="true"
                    aria-label={`${item.label} menu`}
                    className="-ml-1 rounded-full p-1.5 transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        openMenu === item.label ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`absolute left-0 top-full w-[22rem] pt-3 transition-all duration-200 ${
                    openMenu === item.label
                      ? 'pointer-events-auto translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0'
                  }`}
                >
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-white p-2 shadow-xl shadow-black/5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpenMenu(null)}
                        className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                      >
                        <span className="block text-sm font-medium text-foreground">{child.label}</span>
                        {child.hint ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{child.hint}</span>
                        ) : null}
                      </Link>
                    ))}
                    <Link
                      href={item.href}
                      onClick={() => setOpenMenu(null)}
                      className="mt-1 block border-t border-border/60 px-3 pb-1 pt-2.5 text-xs font-semibold text-foreground hover:underline"
                    >
                      View all {item.label.toLowerCase()} {'→'}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 font-medium transition-colors hover:text-foreground ${
                  isActive(item.href) ? 'text-foreground' : ''
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <Link
          href="/contact"
          className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground transition hover:opacity-90 md:inline-block"
        >
          Free Consultation {'→'}
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {items.map((item) =>
              item.children && item.children.length > 0 ? (
                <div key={item.href} className="border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 py-3 text-sm font-medium text-muted-foreground"
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMobileSection(mobileSection === item.label ? null : item.label)}
                      aria-expanded={mobileSection === item.label}
                      aria-label={`${item.label} submenu`}
                      className="p-2 text-muted-foreground"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          mobileSection === item.label ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {mobileSection === item.label ? (
                    <div className="flex flex-col gap-0.5 pb-3 pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg py-2 pl-3 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-border/50 py-3 text-sm font-medium text-muted-foreground last:border-0 hover:text-foreground"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-3 rounded-full bg-ink px-5 py-2.5 text-center text-sm font-semibold text-ink-foreground"
            >
              Free Consultation {'→'}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
