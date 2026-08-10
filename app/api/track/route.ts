import { NextResponse } from 'next/server';
import { z } from 'zod';
import { execute } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { rateLimit } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  path: z.string().max(300),
  session_id: z.string().length(32).optional(),
  referrer: z.string().max(400).optional().or(z.literal('')),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(160).optional(),
    })
    .optional(),
});

/**
 * First-party pageview collector.
 *
 * Always returns 204 — a tracking beacon must never surface an error to the
 * visitor or block navigation.
 */
export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  try {
    const ctx = getRequestContext(request.headers);
    if (ctx.isBot) return noContent;

    // Generous cap: real users trigger a few views per minute, bots trigger far more.
    const limit = rateLimit(`track:${ctx.ipHash}`, 60, 60);
    if (!limit.ok) return noContent;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return noContent;
    const d = parsed.data;

    await execute(
      `INSERT INTO pageviews
        (path, referrer, referrer_host, utm_source, utm_medium, utm_campaign,
         country, city, device, browser, os, session_id, ip_hash, is_bot)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      [
        d.path,
        d.referrer || ctx.referrer,
        ctx.referrerHost,
        d.utm?.source || null,
        d.utm?.medium || null,
        d.utm?.campaign || null,
        ctx.country,
        ctx.city,
        ctx.device,
        ctx.browser,
        ctx.os,
        d.session_id || null,
        ctx.ipHash,
      ]
    );
  } catch (err) {
    console.error('[track] failed:', err);
  }

  return noContent;
}
