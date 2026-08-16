import crypto from 'crypto';

/**
 * Shared request-metadata helpers.
 *
 * Consolidates the `x-forwarded-for` one-liner that was duplicated across the
 * contact, login and media-upload routes, and exposes the user-agent/IP parsing
 * that `lib/tracker.ts`, `lib/audit.ts` and the contact route all need.
 */

export function getClientIp(request: Request): string {
  const headers = request.headers;
  // Hostinger fronts the app with a reverse proxy, so XFF is the real source.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export function hashIp(ip: string, salt = process.env.IP_SALT || 'default-salt'): string {
  return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';

  let browser = 'Other';
  // Order matters: Edge and Chrome both claim "Safari", Edge also claims "Chrome".
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { device, browser, os };
}

export function isBotUserAgent(ua: string): boolean {
  return /bot|crawler|spider|crawling|slurp|bingpreview|headless|curl|wget|python-requests|axios|postman/i.test(ua);
}

export function extractReferrerHost(referrer: string): string | null {
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

/** Best-effort country from the CDN/proxy headers Hostinger and Cloudflare set. */
export function getCountry(request: Request): string | null {
  return (
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-geo-country') ||
    null
  );
}
