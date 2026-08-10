import { createHash } from 'crypto';

export type RequestContext = {
  ipHash: string | null;
  country: string | null;
  city: string | null;
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  isBot: boolean;
  referrer: string | null;
  referrerHost: string | null;
};

/**
 * Hash an IP with a server-side salt. We never store raw IPs — the hash is
 * only used to count unique visitors and to key rate limits, which keeps the
 * analytics side GDPR-friendly.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_SALT || process.env.AUTH_SECRET || 'nm-fallback-salt';
  return createHash('sha256').update(ip + salt).digest('hex');
}

export function clientIp(headers: Headers): string {
  // Hostinger fronts the app with a proxy, so the socket address is the proxy.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || '0.0.0.0';
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|monitor|curl|wget|python-requests|axios|postman|ahrefs|semrush|mj12|dotbot|petalbot|gptbot|claudebot|ccbot/i;

export function parseUserAgent(ua: string) {
  const isBot = BOT_RE.test(ua);

  const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  const isMobile = !isTablet && /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua);
  const device: RequestContext['device'] = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  // Order matters: Edge and Opera both advertise Chrome in their UA string.
  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox\/|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome\/|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  let os = 'Other';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { device, browser, os, isBot };
}

/**
 * Build the tracking context for a request.
 *
 * Geo comes from the CDN headers Hostinger/Cloudflare already attach, so there
 * is no per-request lookup to a third-party geo API — that keeps it free and
 * adds no latency.
 */
export function getRequestContext(headers: Headers): RequestContext {
  const ua = headers.get('user-agent') || '';
  const { device, browser, os, isBot } = parseUserAgent(ua);

  const country =
    headers.get('cf-ipcountry') ||
    headers.get('x-vercel-ip-country') ||
    headers.get('x-geo-country') ||
    null;

  const city =
    headers.get('cf-ipcity') ||
    headers.get('x-vercel-ip-city') ||
    headers.get('x-geo-city') ||
    null;

  const referrer = headers.get('referer');
  let referrerHost: string | null = null;
  if (referrer) {
    try {
      referrerHost = new URL(referrer).host;
    } catch {
      referrerHost = null;
    }
  }

  return {
    ipHash: hashIp(clientIp(headers)),
    country: country ? country.toUpperCase().slice(0, 2) : null,
    city: city ? decodeURIComponent(city).slice(0, 120) : null,
    device,
    browser,
    os,
    isBot,
    referrer: referrer ? referrer.slice(0, 400) : null,
    referrerHost,
  };
}

/** Classify a referrer host into a traffic channel for the dashboard. */
export function trafficChannel(
  referrerHost: string | null,
  utmMedium: string | null,
  ownHost: string
): 'direct' | 'organic' | 'social' | 'paid' | 'referral' | 'internal' {
  if (utmMedium) {
    const m = utmMedium.toLowerCase();
    if (/cpc|ppc|paid/.test(m)) return 'paid';
    if (/social/.test(m)) return 'social';
    if (/organic/.test(m)) return 'organic';
  }
  if (!referrerHost) return 'direct';
  if (referrerHost === ownHost) return 'internal';
  if (/google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|brave/.test(referrerHost)) return 'organic';
  if (/facebook|instagram|linkedin|twitter|x\.com|t\.co|tiktok|youtube|pinterest|reddit|whatsapp/.test(referrerHost)) return 'social';
  return 'referral';
}
