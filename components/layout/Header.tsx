'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Nextmove Services" className="h-10 w-auto" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="font-medium transition-colors hover:text-foreground">{n.label}</Link>
          ))}
        </nav>
        <Link href="/contact" className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground transition hover:opacity-90 md:inline-block">
          Free Consultation {'\u2192'}
        </Link>
        <button onClick={() => setOpen(!open)} className="p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">{n.label}</Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-ink px-5 py-2.5 text-center text-sm font-semibold text-ink-foreground">Free Consultation {'\u2192'}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
