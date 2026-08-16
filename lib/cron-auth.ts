import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { logger, redactIp } from '@/lib/logger';
import { getClientIp } from '@/lib/request-meta';

/**
 * Cron endpoint authentication.
 *
 * Two problems with the previous approach:
 *
 * 1. The secret was passed as `?secret=…` in the query string, which is written
 *    verbatim into access logs, proxy logs and browser history.
 * 2. It was compared with `!==`, which short-circuits on the first differing byte
 *    and leaks length/prefix information through timing.
 *
 * The secret now travels in an `Authorization: Bearer` header (with the query
 * parameter still accepted, since some shared-hosting cron runners can only fetch
 * a plain URL — those callers are warned in the logs). Comparison is
 * constant-time.
 */

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // Hash both sides so differing lengths don't leak via an early return.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export interface CronAuthResult {
  ok: boolean;
  /** Present when auth failed — return this from the handler. */
  reason?: string;
}

export function authorizeCron(request: NextRequest, job: string): CronAuthResult {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    logger.error('cron.secret_not_configured', { job });
    return { ok: false, reason: 'not_configured' };
  }

  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearer) {
    if (timingSafeCompare(bearer, expected)) return { ok: true };
    logger.warn('cron.auth_failed', { job, via: 'header', ip: redactIp(getClientIp(request)) });
    return { ok: false, reason: 'bad_secret' };
  }

  const querySecret = new URL(request.url).searchParams.get('secret');
  if (querySecret) {
    if (timingSafeCompare(querySecret, expected)) {
      logger.warn('cron.secret_in_query_string', {
        job,
        hint: 'Move the secret to an Authorization: Bearer header — query strings are logged.',
      });
      return { ok: true };
    }
    logger.warn('cron.auth_failed', { job, via: 'query', ip: redactIp(getClientIp(request)) });
    return { ok: false, reason: 'bad_secret' };
  }

  logger.warn('cron.auth_missing', { job, ip: redactIp(getClientIp(request)) });
  return { ok: false, reason: 'missing_secret' };
}
