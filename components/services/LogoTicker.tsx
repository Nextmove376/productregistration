import LogoMarquee from '@/components/ui/LogoMarquee';
import type { LogoItem, LogosContent } from '@/lib/service-content';

/**
 * Scrolling logo strip ("trust bar") for a service page.
 *
 * The track itself now lives in `components/ui/LogoMarquee.tsx`, shared with the
 * landing page so the two strips cannot diverge again. What remains here is the
 * service-page chrome — the cream band and the optional editor-supplied heading —
 * plus the default logo set used until an editor picks their own.
 */

/** The logos the pages shipped with, used until an editor sets their own. */
export const DEFAULT_SERVICE_LOGOS: LogoItem[] = [
  { imageUrl: '/logos/mohap-1.svg', label: 'Ministry of Health and Prevention', href: '' },
  { imageUrl: '/logos/DRUG.svg', label: 'Dubai Municipality', href: '' },
  {
    imageUrl: '/logos/67da7400f25dbf4c5bb11dc0_Meydan-FZ.webp',
    label: 'Meydan Free Zone',
    href: '',
  },
  { imageUrl: '/logos/SPCFZ-Sharjah.png', label: 'Sharjah Publishing City Free Zone', href: '' },
];

export default function LogoTicker({
  content,
  fallback = DEFAULT_SERVICE_LOGOS,
}: {
  content: LogosContent;
  fallback?: LogoItem[];
}) {
  const items = content.items.length > 0 ? content.items : fallback;
  if (items.length === 0) return null;

  return (
    <section className="border-b border-border bg-[var(--cream)]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {content.heading && (
          <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {content.heading}
          </p>
        )}

        <LogoMarquee items={items} grayscale={content.grayscale} speed={content.speed} />
      </div>
    </section>
  );
}
