import { NextRequest, NextResponse } from 'next/server';
import { verifySession, type SessionPayload } from '@/lib/auth';

interface AuthResult {
  session: SessionPayload;
  error?: NextResponse;
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const session = await verifySession();
  if (!session) {
    return {
      session: null as unknown as SessionPayload,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session };
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const session = await verifySession();
  if (!session) {
    return {
      session: null as unknown as SessionPayload,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (session.role !== 'admin') {
    return {
      session,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session };
}

export function checkCsrf(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

// Simple in-process rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}
