import { NextResponse } from 'next/server';
import { z } from 'zod';
import { login } from '@/lib/auth';
import { rateLimit, tooMany } from '@/lib/api-auth';
import { clientIp, hashIp } from '@/lib/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  // Throttle by IP on top of the per-account lockout in login().
  const ipKey = hashIp(clientIp(request.headers));
  const limit = rateLimit(`login:${ipKey}`, 10, 600);
  if (!limit.ok) return tooMany(limit.retryAfter);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
