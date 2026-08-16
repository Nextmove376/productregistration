/**
 * Query-parameter helpers for list endpoints.
 *
 * `LIMIT`/`OFFSET` are interpolated into SQL rather than bound as placeholders:
 * mysql2's prepared-statement path sends them in a way MySQL rejects in that
 * position. Interpolation is only safe because these helpers guarantee the values
 * are finite, floored integers within a fixed range — never raw user input.
 */

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

const MAX_PAGE = 100_000;

export function getPagination(
  searchParams: URLSearchParams,
  { defaultLimit = 20, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {}
): Pagination {
  const rawLimit = Number(searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), maxLimit)
    : defaultLimit;

  const rawPage = Number(searchParams.get('page'));
  const page = Number.isFinite(rawPage) && rawPage > 0
    ? Math.min(Math.floor(rawPage), MAX_PAGE)
    : 1;

  return { page, limit, offset: (page - 1) * limit };
}

/** Trimmed search term, length-capped so a huge LIKE pattern can't be used to stall the DB. */
export function getSearch(searchParams: URLSearchParams, key = 'q'): string {
  return (searchParams.get(key) || '').trim().slice(0, 100);
}

/** Returns the value only if it is one of `allowed`, otherwise null. */
export function getEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[]
): T | null {
  const value = searchParams.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function paginatedResponse<T>(data: T[], total: number, { page, limit }: Pagination) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
