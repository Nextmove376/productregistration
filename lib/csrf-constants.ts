/**
 * CSRF names shared between server and client.
 *
 * Kept separate from `lib/csrf.ts` because that module imports `next/headers`
 * and `node:crypto`, neither of which can be pulled into a Client Component.
 */
export const CSRF_COOKIE_NAME = 'nm_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
