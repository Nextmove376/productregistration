'use client';

/**
 * Client-side API helper for the admin panel.
 *
 * Solves three problems that together produced the "Delete failed. Please try
 * again." bug:
 *
 * 1. **Blind JSON parsing.** The old code called `res.json()` *before* checking
 *    `res.ok`, so any non-JSON response (an HTML 403/405 page from the host, an
 *    empty 502) threw a SyntaxError straight into the catch block and reported a
 *    generic message that hid the real status. Here the body is read as text and
 *    parsed defensively, and the HTTP status is always surfaced.
 *
 * 2. **Blocked HTTP verbs.** Shared hosting reverse proxies frequently reject
 *    DELETE and PATCH. When that happens we retry the same operation through a
 *    POST action envelope, which the API routes also accept.
 *
 * 3. **CSRF.** The double-submit token is attached automatically, so no call site
 *    can forget it.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf-constants';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code = 'UNKNOWN', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1)) : null;
}

/** Human-readable fallback when the server didn't send a JSON error. */
function describeStatus(status: number, statusText: string): string {
  switch (status) {
    case 401:
      return 'Your session expired. Please sign in again.';
    case 403:
      return 'Permission denied (403). Refresh the page and try again.';
    case 404:
      return 'Not found (404). This item may already be deleted.';
    case 405:
      return 'The server rejected this request method (405).';
    case 413:
      return 'The file is too large for the server to accept (413).';
    case 429:
      return 'Too many requests. Please wait a moment and retry.';
    case 502:
    case 503:
    case 504:
      return `The server is temporarily unavailable (${status}). Please retry.`;
    default:
      return `Request failed with status ${status}${statusText ? ` (${statusText})` : ''}.`;
  }
}

interface ParsedResponse {
  ok: boolean;
  status: number;
  data: any;
  /** True when the body could not be parsed as JSON — a strong signal the request never reached the app. */
  nonJson: boolean;
}

async function parseResponse(res: Response): Promise<ParsedResponse> {
  const text = await res.text();

  if (!text) {
    return { ok: res.ok, status: res.status, data: null, nonJson: !res.ok };
  }

  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text), nonJson: false };
  } catch {
    return { ok: res.ok, status: res.status, data: { raw: text.slice(0, 500) }, nonJson: true };
  }
}

function toError(parsed: ParsedResponse, res: Response): ApiError {
  const serverMessage =
    parsed.data && typeof parsed.data === 'object' && typeof parsed.data.error === 'string'
      ? parsed.data.error
      : null;

  return new ApiError(
    serverMessage || describeStatus(parsed.status, res.statusText),
    parsed.status,
    parsed.data?.code ?? 'UNKNOWN',
    parsed.data?.details ?? (parsed.nonJson ? parsed.data : undefined)
  );
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send FormData as-is (no JSON headers). */
  formData?: FormData;
  signal?: AbortSignal;
  /**
   * If the proxy rejects the verb, retry as POST to this URL with this envelope.
   * Enables deletes to work on hosts that block DELETE.
   */
  fallback?: { url: string; body: Record<string, unknown> };
}

/** True when the failure looks like the request never reached the Next.js app. */
function shouldTryFallback(parsed: ParsedResponse): boolean {
  if (parsed.ok) return false;
  // 405 = verb rejected. A non-JSON body on 4xx/5xx means something in front of
  // the app answered instead of our route handler.
  return parsed.status === 405 || parsed.status === 501 || parsed.nonJson;
}

export async function apiRequest<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, signal, fallback } = options;

  const headers: Record<string, string> = {};
  const csrf = readCsrfToken();
  if (csrf) headers[CSRF_HEADER_NAME] = csrf;
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';

  const send = (target: string, verb: string, payload?: BodyInit) =>
    fetch(target, {
      method: verb,
      credentials: 'include',
      headers,
      body: payload,
      signal,
    });

  let res: Response;
  try {
    res = await send(
      url,
      method,
      formData ?? (body !== undefined ? JSON.stringify(body) : undefined)
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Network error — check your connection and try again.', 0, 'NETWORK');
  }

  let parsed = await parseResponse(res);

  if (!parsed.ok && fallback && shouldTryFallback(parsed)) {
    try {
      const retry = await send(fallback.url, 'POST', JSON.stringify(fallback.body));
      const retryParsed = await parseResponse(retry);
      // Only prefer the fallback result if it actually got through.
      if (retryParsed.ok || !retryParsed.nonJson) {
        res = retry;
        parsed = retryParsed;
      }
    } catch {
      /* keep the original failure */
    }
  }

  if (!parsed.ok) throw toError(parsed, res);
  return parsed.data as T;
}

export const api = {
  get: <T = any>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...opts, method: 'GET' }),
  post: <T = any>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...opts, method: 'POST', body }),
  put: <T = any>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...opts, method: 'PUT', body }),
  patch: <T = any>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...opts, method: 'PATCH', body }),
  delete: <T = any>(url: string, opts?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(url, { ...opts, method: 'DELETE' }),
};
