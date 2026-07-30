'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';

const NAV = [
  { label: 'Home', href: '/' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'MOHAP / EDE Registration', href: '/services/mohap-registration' },
      { label: 'Product Registration', href: '/services/product-registration' },
      { label: 'Regulatory Approvals', href: '/services/regulatory-approvals' },
      { label: 'MOFA & PRO Services', href: '/services/mofa-attestation' },
      { label: 'Business Setup', href: '/services/business-setup' },
      { label: 'Trademark & Drugstore', href: '/services/medical-drugstore' },
    ],
  },
  { label: 'Who We Are', href: '/about', displayOnly: true },
  { label: 'Team', href: '/team' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center shrink-0">
          <img
            src="/images/logo.png"
            alt="Nextmove Services"
            width={220}
            height={56}
            className="h-14 w-auto md:h-16"
          />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((n) => {
            if ('children' in n && n.children) {
              return (
                <div key={n.href} ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onMouseEnter={() => setDropdownOpen(true)}
                    className={`flex items-center gap-1 font-medium transition-colors hover:text-foreground ${
                      pathname.startsWith('/services') ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                  >
                    {n.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dropdownOpen && (
                    <div
                      onMouseLeave={() => setDropdownOpen(false)}
                      className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-background p-2 shadow-lg"
                    >
                      {n.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setDropdownOpen(false)}
                          className={`block rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-muted hover:text-foreground ${
                            pathname === child.href ? 'text-foreground font-medium bg-muted' : 'text-muted-foreground'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if ('displayOnly' in n && n.displayOnly) {
              return (
                <span
                  key={n.href}
                  className="font-medium text-muted-foreground cursor-default"
                >
                  {n.label}
                </span>
              );
            }

            return (
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
            );
          })}
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
            {NAV.map((n) => {
              if ('children' in n && n.children) {
                return (
                  <div key={n.href}>
                    <span className="text-sm font-medium text-muted-foreground">{n.label}</span>
                    <div className="ml-4 mt-2 flex flex-col gap-2">
                      {n.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={`text-sm transition-colors hover:text-foreground ${
                            pathname === child.href ? 'text-foreground font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              if ('displayOnly' in n && n.displayOnly) {
                return (
                  <span key={n.href} className="text-sm font-medium text-muted-foreground cursor-default">
                    {n.label}
                  </span>
                );
              }

              return (
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
              );
            })}
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
