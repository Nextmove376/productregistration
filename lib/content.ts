/**
 * Content helpers shared between the blog API routes and the admin forms.
 *
 * Kept out of the route modules so importing one route handler's file doesn't
 * pull in another route's segment config and side effects.
 */

/** Words-per-minute estimate, computed server-side so it can't be spoofed or forgotten. */
export function readingMinutes(html: string, wordsPerMinute = 200): number {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return 0;
  return Math.max(1, Math.round(text.split(' ').length / wordsPerMinute));
}

/** URL-safe slug matching the `^[a-z0-9-]+$` constraint the API enforces. */
export function slugify(input: string, maxLength = 200): string {
  return input
    .toLowerCase()
    .trim()
    // Strip diacritics so "Attestation Dubaï" becomes "attestation-dubai".
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
}

/** MySQL DATETIME string in UTC — the pool is configured with `timezone: 'Z'`. */
export function toMysqlDateTime(value: Date | string = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Builds an excerpt from body HTML when the author left the field blank. */
export function deriveExcerpt(html: string, maxLength = 300): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
