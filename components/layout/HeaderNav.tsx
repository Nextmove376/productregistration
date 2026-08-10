'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import type { MenuItem } from '@/lib/settings';

export default function HeaderNav({ items }: { items: MenuItem[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menus whenever navigation completes, otherwise the dropdown stays
  // open on top of the new page.
  useEffect(() => {
    setMobileOpen(false);
    setOpenId(null);
    setExpandedId(null);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenId(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const isActive = (url: string) =>
    url === '/' ? pathname === '/' : pathname === url || pathname.startsWith(url + '/');

  return (
    <div ref={navRef} className="flex flex-1 items-center justify-end gap-4">
      <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm md:flex">
        {items.map((item) =>
          item.children.length ? (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setOpenId(item.id)}
              onMouseLeave={() => setOpenId(null)}
            >
              {/* A parent with children is still a real link — the chevron is a
                  separate control, so the section stays reachable. */}
              <span className="flex items-center gap-1">
                <Link
                  href={item.url}
                  className={`font-medium transition-colors hover:text-slate-900 ${
                    isActive(item.url) ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </Link>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  aria-label={`${openId === item.id ? 'Hide' : 'Show'} ${item.label} submenu`}
                  aria-expanded={openId === item.id}
                  className="rounded p-0.5 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openId === item.id ? 'rotate-180' : ''}`}
                  />
                </button>
              </span>
              {openId === item.id && (
                <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3">
                  <div className="rounded-xl border border-black/[0.07] bg-white p-2 shadow-[0_18px_50px_-18px_rgba(15,34,51,0.35)]">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        target={child.open_new_tab ? '_blank' : undefined}
                        rel={child.open_new_tab ? 'noopener noreferrer' : undefined}
                        className={`block rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                          pathname === child.url ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.id}
              href={item.url}
              target={item.open_new_tab ? '_blank' : undefined}
              rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
              aria-current={isActive(item.url) ? 'page' : undefined}
              className={`font-medium transition-colors hover:text-slate-900 ${
                isActive(item.url) ? 'text-slate-900' : 'text-slate-600'
              }`}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>

      <Link
        href="/contact"
        className="hidden shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground transition hover:opacity-90 md:inline-block"
      >
        Free Consultation →
      </Link>

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-controls="mobile-menu"
        className="-mr-1 rounded-md p-2 text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-t border-black/[0.07] bg-white px-5 py-4 shadow-lg md:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col">
            {items.map((item) => (
              <div key={item.id} className="border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between">
                  <Link
                    href={item.url}
                    className={`flex-1 py-3 text-sm font-medium ${
                      isActive(item.url) ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                  {item.children.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      aria-label={`${expandedId === item.id ? 'Hide' : 'Show'} ${item.label} submenu`}
                      aria-expanded={expandedId === item.id}
                      className="p-3 text-slate-500"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
                {item.children.length > 0 && expandedId === item.id && (
                  <div className="ml-3 flex flex-col border-l border-slate-200 pb-2 pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className={`py-2 text-sm ${
                          pathname === child.url ? 'font-medium text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/contact"
              className="mt-4 rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-ink-foreground"
            >
              Free Consultation →
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
