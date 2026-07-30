/**
 * Escapes all HTML entities for safe display.
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips dangerous attributes (on*, javascript: hrefs) from allowed tags.
 * Removes all tags except basic formatting.
 */
export function stripUnsafeHTML(html: string): string {
  const allowedTags = ['p', 'br', 'strong', 'em', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'];
  const allowedAttrs: Record<string, string[]> = {
    a: ['href', 'title', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
  };

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
      const lower = tag.toLowerCase();
      if (!allowedTags.includes(lower)) return '';
      if (match.startsWith('</')) return `</${lower}>`;
      const attrs = allowedAttrs[lower];
      if (!attrs) return `<${lower}>`;
      const cleaned = match.replace(
        /\s+([a-zA-Z_:][\w:.-]*)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?/g,
        (attrMatch: string, name: string, _eq: string, val: string) => {
          const attrLower = name.toLowerCase();
          if (attrLower.startsWith('on')) return '';
          if (attrLower === 'style') return '';
          if (val && attrLower === 'href' && /javascript\s*:/i.test(val)) return '';
          if (val && attrLower === 'src' && /javascript\s*:/i.test(val)) return '';
          if (!attrs.includes(attrLower)) return '';
          return attrMatch;
        }
      );
      return cleaned.replace(/<([a-zA-Z][a-zA-Z0-9]*)\s*>/, '<$1>');
    });
}
