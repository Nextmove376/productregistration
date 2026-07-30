'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Team', href: '/team' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Nextmove Services" width={160} height={48} className="h-12 w-auto" />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? 'page' : undefined}
              className={`font-medium transition-colors hover:text-foreground ${
                pathname === n.href ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/contact"
          className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground transition hover:opacity-90 md:inline-block"
        >
          Free Consultation \u2192
        </Link>
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="rounded-md p-2 md:hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-background px-5 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === n.href ? 'page' : undefined}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  pathname === n.href ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-ink px-5 py-2.5 text-center text-sm font-semibold text-ink-foreground"
            >
              Free Consultation \u2192
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
