import Link from 'next/link';
import { Home } from 'lucide-react';

/**
 * Breadcrumb trail + its structured data.
 *
 * The services list page previously hand-wrote a `BreadcrumbList` JSON-LD block
 * with no visible breadcrumbs at all, and the single-service page had neither.
 * Both now come from one `items` array, so the markup a crawler reads and the
 * trail a visitor sees cannot disagree.
 *
 * Rendered as a pill-shaped bar that sits over the hero: the last crumb is the
 * current page and is not a link (`aria-current="page"`), per the ARIA
 * breadcrumb pattern.
 */

export interface Crumb {
  label: string;
  /** Omit on the final crumb — the current page is not a link. */
  href?: string;
}

const SITE = 'https://productregistrationinuae.com';

/** Absolute URL for JSON-LD; `item` must be absolute for Google. */
function absolute(href: string): string {
  return href.startsWith('http') ? href : `${SITE}${href.startsWith('/') ? href : `/${href}`}`;
}

export default function Breadcrumbs({
  items,
  tone = 'dark',
  className = '',
}: {
  items: Crumb[];
  /** `dark` for placement on the navy hero, `light` for a pale background. */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  if (items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      // The current page still gets an `item`, pointing at itself.
      item: absolute(crumb.href ?? '/'),
    })),
  };

  const isDark = tone === 'dark';
  const base = isDark ? 'text-[var(--cream)]/70' : 'text-muted-foreground';
  const linkHover = isDark ? 'hover:text-[var(--teal)]' : 'hover:text-[var(--teal-deep)]';
  const current = isDark ? 'text-[var(--cream)]' : 'text-foreground';
  const shell = isDark
    ? 'border-[var(--cream)]/15 bg-[var(--cream)]/5 backdrop-blur-sm'
    : 'border-border bg-[var(--cream)]';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol
          className={`inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-full border px-3.5 py-2 text-xs ${shell} ${base}`}
        >
          {items.map((crumb, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={`${crumb.label}-${i}`} className="inline-flex min-w-0 items-center gap-1">
                {i > 0 && (
                  <span aria-hidden="true" className="select-none px-0.5 opacity-40">
                    /
                  </span>
                )}
                {isLast || !crumb.href ? (
                  <span aria-current="page" className={`truncate font-medium ${current}`}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className={`inline-flex items-center gap-1.5 truncate transition-colors ${linkHover}`}
                  >
                    {i === 0 && <Home className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
