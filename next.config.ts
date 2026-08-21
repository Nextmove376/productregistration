import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy.
 *
 * `'unsafe-eval'` is allowed in development only. `next dev` needs it for React
 * Refresh and eval-based source maps; a production build does not, and leaving it
 * on gave `eval()`-based payloads a working execution path for no benefit.
 *
 * `'unsafe-inline'` in `script-src` is still here and is the weakest part of this
 * policy — Next inlines its own bootstrap scripts, so removing it requires issuing
 * a per-request nonce from `proxy.ts` and threading it through. That is a separate
 * change with its own risk (it opts every page out of static optimisation), not
 * something to fold into a security pass on a live site.
 *
 * `object-src`, `base-uri` and `form-action` are set because their absence is
 * exploitable even with a tight `script-src`: `<base href>` injection redirects
 * every relative script URL, and an injected `<form action>` exfiltrates whatever
 * the user types to another origin.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  /*
   * Image optimisation.
   *
   * `localPatterns` is deliberately NOT set. Omitting it allows every local path,
   * which is what lets `next/image` optimise `/api/media/**` — the route the CMS
   * serves uploads from. Adding a narrow `localPatterns` here would silently stop
   * optimising every admin-uploaded image, so if one is ever added it must include
   * `/api/media/**`.
   *
   * `qualities` must be listed explicitly: as of v16 it defaults to `[75]` only, and
   * a request for a quality outside the list is rejected with a 400 rather than being
   * clamped. `ServiceHero` asks for 85 and 80, so both are allowlisted alongside the
   * default 75 — without this, those heroes would fail to load.
   */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'productregistrationinuae.com' },
    ],
    // AVIF first, WebP as the fallback: roughly 20-30% smaller than WebP alone on
    // photographic content, which is what the hero and blog featured images are.
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80, 85],
    // 30 days. Uploads are content-addressed by filename, so a cached derivative can
    // never go stale for a given URL — a replaced image gets a new filename.
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
