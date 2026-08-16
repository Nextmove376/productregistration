import { NextResponse } from 'next/server';

/**
 * One JSON error shape for every API route: `{ error, code, details? }`.
 *
 * The media-delete bug was hard to diagnose partly because failures surfaced as
 * HTML or empty bodies that the client's `res.json()` choked on. Routing every
 * response through here guarantees the client always gets parseable JSON.
 */
export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

function json(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers });
}

export function ok<T>(data: T, headers?: HeadersInit) {
  return json(data, 200, headers);
}

export function created<T>(data: T) {
  return json(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(error = 'Invalid request', details?: unknown) {
  return json({ error, code: 'BAD_REQUEST', details } satisfies ApiErrorBody, 400);
}

export function invalidJson() {
  return json({ error: 'Request body must be valid JSON', code: 'INVALID_JSON' } satisfies ApiErrorBody, 400);
}

export function validationFailed(details: unknown) {
  return json(
    { error: 'Validation failed', code: 'VALIDATION_FAILED', details } satisfies ApiErrorBody,
    422
  );
}

export function unauthorized(error = 'Unauthorized') {
  return json({ error, code: 'UNAUTHORIZED' } satisfies ApiErrorBody, 401);
}

export function forbidden(error = 'Forbidden') {
  return json({ error, code: 'FORBIDDEN' } satisfies ApiErrorBody, 403);
}

export function csrfFailed() {
  return json({ error: 'CSRF validation failed', code: 'CSRF_FAILED' } satisfies ApiErrorBody, 403);
}

export function notFound(error = 'Not found') {
  return json({ error, code: 'NOT_FOUND' } satisfies ApiErrorBody, 404);
}

export function conflict(error: string, details?: unknown) {
  return json({ error, code: 'CONFLICT', details } satisfies ApiErrorBody, 409);
}

export function tooManyRequests(retryAfterSeconds: number) {
  return json(
    { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED', details: { retryAfterSeconds } } satisfies ApiErrorBody,
    429,
    { 'Retry-After': String(Math.max(1, retryAfterSeconds)) }
  );
}

export function serverError(error = 'Internal server error', details?: unknown) {
  return json(
    {
      error,
      code: 'SERVER_ERROR',
      // Never leak stack traces or driver messages to the client in production.
      details: process.env.NODE_ENV === 'production' ? undefined : details,
    } satisfies ApiErrorBody,
    500
  );
}

/** Safely parse a JSON body; returns a discriminated result instead of throwing. */
export async function parseJsonBody(request: Request): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}
