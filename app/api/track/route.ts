import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/api-auth';
import { trackPageview } from '@/lib/tracker';
import { getClientIp, getCountry, isBotUserAgent } from '@/lib/request-meta';
import { invalidJson, ok, parseJsonBody, tooManyRequests, validationFailed } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Pageview beacon.
 *
 * `trackPageview` existed in `lib/tracker.ts` but was never called from anywhere,
 * so `pageviews` and `daily_stats` stayed permanently empty and the entire
 * analytics screen reported zeros. This endpoint, plus the client beacon in
 * `components/analytics/PageviewTracker.tsx`, is what actually feeds it.
 */
const trackSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional().default(''),
  sessionId: z.string().max(64).optional().default(''),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Always answer 200 so a blocked or throttled beacon never shows up as a
  // console error on the public site.
  if (isBotUserAgent(userAgent)) return ok({ ok: true, skipped: 'bot' });

  // Generous, but enough to stop a single client flooding the table.
  const limit = rateLimit(`track:${ip}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = trackSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;

  // Never make the visitor wait on an analytics insert.
  after(() =>
    trackPageview({
      path: d.path,
      referrer: d.referrer || undefined,
      userAgent,
      ip,
      sessionId: d.sessionId || undefined,
      country: getCountry(request),
      utmSource: d.utm_source,
      utmMedium: d.utm_medium,
      utmCampaign: d.utm_campaign,
      utmTerm: d.utm_term,
      utmContent: d.utm_content,
    })
  );

  return ok({ ok: true });
}
