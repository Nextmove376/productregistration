import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createSession,
  fakePasswordCompare,
  getUserForLogin,
  isLockedOut,
  recordFailedAttempt,
  resetFailedAttempts,
  verifyPassword,
} from '@/lib/auth';
import { rateLimit, resetRateLimit } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { logger, redactIp } from '@/lib/logger';
import { getClientIp } from '@/lib/request-meta';
import { badRequest, ok, tooManyRequests, unauthorized, invalidJson, parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

/** Identical response for every credential failure — no hint about which part was wrong. */
const GENERIC_FAILURE = 'Invalid email or password.';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Per-IP limit.
  const ipLimit = rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = loginSchema.safeParse(parsed.data);
  if (!validation.success) return badRequest('Enter a valid email and password.');

  const { email: rawEmail, password } = validation.data;
  const email = rawEmail.trim().toLowerCase();

  // Per-account limit, so one target cannot be attacked from many IPs.
  const accountLimit = rateLimit(`login:acct:${email}`, 12, 15 * 60 * 1000);
  if (!accountLimit.ok) return tooManyRequests(accountLimit.retryAfter);

  const user = await getUserForLogin(email);

  // Timing equalisation: a non-existent account must cost the same bcrypt work as
  // a wrong password, otherwise response time reveals which emails are valid.
  if (!user) {
    await fakePasswordCompare(password);
    after(() =>
      logAudit({
        action: 'login.failed',
        entity: 'session',
        actorEmail: email,
        request,
        meta: { reason: 'no_such_user' },
      })
    );
    logger.warn('login.failed', { email, ip: redactIp(ip), reason: 'no_such_user' });
    return unauthorized(GENERIC_FAILURE);
  }

  const lock = isLockedOut(user);
  if (lock.locked) {
    const minutes = Math.max(1, Math.ceil(lock.remainingMs / 60_000));
    after(() =>
      logAudit({
        action: 'login.locked',
        entity: 'session',
        entityId: user.id,
        actorEmail: email,
        request,
        meta: { remainingMinutes: minutes },
      })
    );
    logger.warn('login.locked', { email, ip: redactIp(ip), minutes });
    return tooManyRequests(lock.remainingMs / 1000);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await recordFailedAttempt(email);
    after(() =>
      logAudit({
        action: 'login.failed',
        entity: 'session',
        entityId: user.id,
        actorEmail: email,
        request,
        meta: { reason: 'bad_password' },
      })
    );
    logger.warn('login.failed', { email, ip: redactIp(ip), reason: 'bad_password' });
    return unauthorized(GENERIC_FAILURE);
  }

  // A deactivated user must not be able to sign in, and must not be told why.
  if (Number(user.is_active) !== 1) {
    after(() =>
      logAudit({
        action: 'login.failed',
        entity: 'session',
        entityId: user.id,
        actorEmail: email,
        request,
        meta: { reason: 'inactive' },
      })
    );
    logger.warn('login.failed', { email, ip: redactIp(ip), reason: 'inactive' });
    return unauthorized(GENERIC_FAILURE);
  }

  await resetFailedAttempts(email);
  await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    sv: Number(user.session_version),
  });

  // A legitimate sign-in shouldn't leave the limiter primed against this user.
  resetRateLimit(`login:acct:${email}`);
  resetRateLimit(`login:ip:${ip}`);

  after(() =>
    logAudit({
      action: 'login.success',
      entity: 'session',
      entityId: user.id,
      actor: { userId: user.id, email: user.email },
      request,
    })
  );
  logger.info('login.success', { userId: user.id, email, ip: redactIp(ip) });

  return ok({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
