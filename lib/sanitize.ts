import DOMPurify from 'isomorphic-dompurify';

const RICH_TEXT_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'hr',
];

const RICH_TEXT_ATTRS = [
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'class', 'id', 'style', 'title',
];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_TAGS,
    ALLOWED_ATTR: RICH_TEXT_ATTRS,
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizePlainText(str: string): string {
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });
}
