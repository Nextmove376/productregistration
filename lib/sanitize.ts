import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML sanitization.
 *
 * These functions existed but were never imported anywhere, while
 * `app/blog/[slug]/page.tsx` rendered `post.content` through
 * `dangerouslySetInnerHTML` — a stored-XSS path straight from the admin editor to
 * every visitor. They are now applied on write (in the blog API) and again on
 * read (before rendering), so rows already in the database are also covered.
 */

const RICH_TEXT_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'div', 'span', 'hr', 'figure', 'figcaption',
];

const RICH_TEXT_ATTRS = [
  'href', 'target', 'rel', 'src', 'srcset', 'alt', 'width', 'height',
  'class', 'id', 'title', 'loading', 'colspan', 'rowspan',
];

/**
 * Only these URL schemes are permitted in `href`/`src`.
 * Blocks `javascript:`, `vbscript:` and `data:` payloads. `data:` is excluded
 * deliberately — `data:text/html` is an XSS vector.
 */
const SAFE_URI = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

export function sanitizeRichText(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_TAGS,
    ALLOWED_ATTR: RICH_TEXT_ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    ALLOWED_URI_REGEXP: SAFE_URI,
    // `style` is dropped entirely: inline CSS enables layout-breaking and
    // exfiltration tricks, and the editor doesn't need it.
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'base'],
    KEEP_CONTENT: true,
  });
}

export function sanitizePlainText(str: string): string {
  if (!str) return '';
  // Strip every tag, then collapse the whitespace left behind.
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitizes an SVG document so it can be served inline without executing script.
 *
 * Uploaded SVGs were served as `image/svg+xml` with a one-year immutable cache
 * header. An SVG is a live document: `<script>` inside one runs with the origin's
 * privileges, so that was a persistent same-origin XSS.
 */
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'a', 'use', 'animate', 'set', 'handler', 'listener'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'href', 'xlink:href'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: SAFE_URI,
  });
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes a value for interpolation into an HTML email body.
 *
 * `lib/mail.ts` interpolated visitor-supplied name/message/company straight into
 * the notification template, letting anyone submit markup (or a phishing link)
 * that rendered in the admin's inbox.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
