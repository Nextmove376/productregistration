import type { LogoItem } from '@/lib/service-content';

/**
 * The scrolling logo track, shared by the landing page and every service page.
 *
 * It exists because there were two separate tickers that had drifted apart. The
 * service-page one had already been fixed; the landing one still carried all three
 * of the original faults:
 *
 *  1. **`grayscale` forced every brand to render black.** Colour is the default here
 *     and greyscale is an explicit opt-in, so a logo only loses its colour when an
 *     editor asks for it.
 *  2. **`opacity-70` dimmed the whole strip,** which is the other half of why the
 *     logos read as washed-out grey rather than as real brands. Full opacity now.
 *  3. **Sizing was by height alone (`h-10 w-auto max-w-[150px]`),** so a square
 *     government seal and a wide wordmark occupied visually unequal space — the
 *     tall one dominated the row. Each logo now sits in a **fixed box** and is
 *     letterboxed into it with `object-contain`, which is what makes a mixed set of
 *     uploads look uniform whatever dimensions the source files happen to have.
 *
 * Only the track lives here, not the surrounding section, because the two callers
 * sit on different backgrounds and standardising the logos must not repaint the
 * page around them.
 *
 * The loop renders the list twice and translates by -50%, so the second copy
 * arrives exactly where the first began and there is no visible jump. Short lists
 * are padded to `MIN_TRACK` first — otherwise a set of three logos leaves a gap
 * before the loop point on a wide monitor.
 */

/** Enough logos on the track that a short list still fills a wide viewport. */
const MIN_TRACK = 10;

const EDGE_FADE =
  'linear-gradient(to right, transparent, black 8%, black 92%, transparent)';

function LogoCell({ item, clone }: { item: LogoItem; clone: boolean }) {
  const img = (
    // A raw <img> rather than next/image: these are ten small static brand files
    // rendered at ~140px wide, and the fixed parent box already reserves their
    // space, so there is no layout shift to solve and nothing to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      // The clone is decorative — announcing every logo twice is worse than silence.
      alt={clone ? '' : item.label || ''}
      className="max-h-full max-w-full object-contain"
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );

  return (
    <li
      // The fixed box is the whole point. Height AND width are pinned, so each
      // logo occupies an identical footprint regardless of its aspect ratio.
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

export default function LogoMarquee({
  items,
  grayscale = false,
  speed = 38,
  className = '',
}: {
  items: LogoItem[];
  /** Opt-in only. The default is full colour, which is the fix for the black logos. */
  grayscale?: boolean;
  /** Seconds for one full loop. Lower is faster. */
  speed?: number;
  className?: string;
}) {
  if (items.length === 0) return null;

  // Pad before duplicating so the -50% loop point always lands on a full track
  // rather than on empty space. `items` is non-empty here, so this terminates.
  const padded: LogoItem[] = [];
  while (padded.length < MIN_TRACK) padded.push(...items);
  const track = [...padded, ...padded];
  const half = padded.length;

  return (
    /*
     * `logo-ticker` is the hook globals.css uses to pause on hover/focus and to
     * stop the animation entirely under prefers-reduced-motion. The mask fades
     * both edges so logos slide out of view instead of being visibly clipped.
     */
    <div
      className={`logo-ticker relative overflow-hidden ${className}`}
      style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
    >
      <ul
        className={`marquee-track flex w-max items-center gap-10 sm:gap-14 ${
          grayscale ? 'grayscale' : ''
        }`}
        style={{ animationDuration: `${speed}s` }}
      >
        {track.map((item, i) => (
          <LogoCell key={`${item.imageUrl}-${i}`} item={item} clone={i >= half} />
        ))}
      </ul>
    </div>
  );
}
