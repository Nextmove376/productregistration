'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SESSION_KEY = 'nm_sid';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/**
 * First-party pageview beacon.
 *
 * Fires once per path change. Uses sendBeacon so the request survives the page
 * unloading and never delays navigation.
 */
export default function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;

    // Respect Do Not Track.
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;

    const payload = JSON.stringify({
      path: pathname,
      session_id: sessionId() || undefined,
      referrer: document.referrer || '',
      utm: {
        source: searchParams.get('utm_source') || undefined,
        medium: searchParams.get('utm_medium') || undefined,
        campaign: searchParams.get('utm_campaign') || undefined,
      },
    });

    try {
      const blob = new Blob([payload], { type: 'application/json' });
      if (!navigator.sendBeacon?.('/api/track', blob)) {
        fetch('/api/track', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
      }
    } catch {
      // Tracking must never break the page.
    }
  }, [pathname, searchParams]);

  return null;
}
