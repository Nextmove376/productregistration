import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize rich-text blog content before it reaches dangerouslySetInnerHTML.
 *
 * The previous regex kept a tag allowlist but preserved every attribute on
 * allowed tags, so `<img src=x onerror=alert(1)>` passed through unchanged.
 * It also missed `vbscript:`, `data:text/html`, and entity-encoded variants.
 * DOMPurify parses the DOM tree properly and blocks all of these.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'strong', 'em', 'u', 's',
      'h2', 'h3', 'h4', 'ul', 'ol', 'li',
      'a', 'img', 'figure', 'figcaption',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'loading'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/(?!\/))/i,
    FORBID_ATTR: ['style', 'srcset', 'formaction', 'form'],
  });
}

/**
 * Escape plain text for safe interpolation into an HTML email or attribute.
 * This is the old `sanitizeHTML` — renamed to make it clear it only works
 * on plain text, not on markup that needs to be rendered.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turn a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/** Approximate reading time for blog cards. */
export function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
