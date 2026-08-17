import type { LogoItem, LogosContent } from '@/lib/service-content';

/**
 * Scrolling logo strip ("trust bar").
 *
 * Replaces the static row of four hardcoded `<img>` tags that had three faults
 * the editor had no way to fix:
 *
 *  1. **It did not move.** There was no animation on it at all.
 *  2. **`grayscale` forced every brand to render black.** Colour is now the
 *     default and greyscale is an explicit opt-in.
 *  3. **Sizing was `h-8 w-auto`,** so a square seal and a wide wordmark ended up
 *     visually unequal — the tall one dominated. Each logo now sits in a **fixed
 *     box** with `object-contain`, so every one occupies the same footprint and
 *     is letterboxed inside it. That is what makes a mixed set of uploads look
 *     uniform, whatever dimensions the source files have.
 *
 * The loop works by rendering the list twice and translating the track by -50%,
 * so the second copy arrives exactly where the first began and there is no jump.
 * Short lists are padded up to `MIN_TRACK` first, otherwise a set of three logos
 * would leave a visible gap before the loop point.
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

/** Enough logos on the track that a short list still fills the viewport. */
const MIN_TRACK = 10;

function LogoCell({ item, clone }: { item: LogoItem; clone: boolean }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={clone ? '' : item.label || ''}
      // The fixed box is the whole point: `object-contain` letterboxes each logo
      // into identical bounds so uploads of any dimension line up.
      className="max-h-full max-w-full object-contain"
      loading={clone ? 'lazy' : undefined}
      draggable={false}
    />
  );

  return (
    <li
      className="flex h-10 w-24 shrink-0 items-center justify-center sm:h-12 sm:w-32 md:h-14 md:w-36"
      aria-hidden={clone || undefined}
    >
      {item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full items-center justify-center"
        >
          {img}
        </a>
      ) : (
        img
      )}
    </li>
  );
}

export default function LogoTicker({
  content,
  fallback = DEFAULT_SERVICE_LOGOS,
}: {
  content: LogosContent;
  fallback?: LogoItem[];
}) {
  const items = content.items.length > 0 ? content.items : fallback;
  if (items.length === 0) return null;

  // Pad short lists before duplicating, so the -50% loop point always lands on a
  // full track rather than on empty space.
  const padded: LogoItem[] = [];
  while (padded.length < MIN_TRACK) padded.push(...items);
  const track = [...padded, ...padded];
  const half = padded.length;

  return (
    <section className="border-b border-border bg-[var(--cream)]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {content.heading && (
          <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {content.heading}
          </p>
        )}

        {/*
          `logo-ticker` gives the CSS in globals.css a hook to pause the track on
          hover and to disable it entirely under prefers-reduced-motion. The mask
          fades both edges so logos slide out of view instead of being clipped.
        */}
        <div
          className="logo-ticker relative overflow-hidden"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          <ul
            className={`marquee-track flex w-max items-center gap-10 sm:gap-14 ${
              content.grayscale ? 'grayscale' : ''
            }`}
            style={{ animationDuration: `${content.speed}s` }}
          >
            {track.map((item, i) => (
              <LogoCell key={`${item.imageUrl}-${i}`} item={item} clone={i >= half} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
