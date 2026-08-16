'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SESSION_KEY = 'nm_sid';

/**
 * Assigns a per-tab session id so `COUNT(DISTINCT session_id)` in the analytics
 * rollup can approximate unique visitors. `sessionStorage` keeps it to the tab and
 * clears on close, which avoids a durable identifier and needs no cookie banner.
 */
function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return '';
  }
}

/**
 * Fires one pageview per route change.
 *
 * Mounted in the root layout. Admin routes are skipped — internal navigation is
 * not site traffic and would distort every metric.
 */
export default function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    const query = searchParams.toString();
    const key = query ? `${pathname}?${query}` : pathname;

    // React may run effects twice in development; don't double count.
    if (lastSent.current === key) return;
    lastSent.current = key;

    const payload = {
      path: pathname,
      referrer: document.referrer || '',
      sessionId: getSessionId(),
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
      utm_term: searchParams.get('utm_term') || undefined,
      utm_content: searchParams.get('utm_content') || undefined,
    };

    const body = JSON.stringify(payload);

    /**
     * `sendBeacon` survives the page being unloaded mid-request, which a normal
     * fetch does not. Falls back to a keepalive fetch where it isn't available.
     */
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon('/api/track', blob)) return;
      }
    } catch {
      /* fall through to fetch */
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics must never surface an error to the visitor */
    });
  }, [pathname, searchParams]);

  return null;
}
