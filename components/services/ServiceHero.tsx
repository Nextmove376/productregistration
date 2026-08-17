import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Breadcrumbs, { type Crumb } from '@/components/Breadcrumbs';
import { heroHasMedia, type ServiceHeroContent } from '@/lib/service-content';

/**
 * Service hero with editor-controlled background media.
 *
 * Three modes, chosen in the admin:
 *
 *  - `image` — `next/image` with `fill`, `priority` and `sizes="100vw"`, so the
 *    hero is optimised and does not compete with the LCP.
 *  - `video` — muted/looping/inline background video. `poster` renders instantly
 *    and remains the only thing mobile users download, because the `<video>` is
 *    hidden below `md` where autoplay is unreliable and the file is expensive on
 *    metered connections.
 *  - `none` — the original navy + teal radial gradient, unchanged.
 *
 * In every mode the copy sits above a darkening overlay whose strength the editor
 * sets, so contrast survives whatever image is chosen.
 */

/**
 * Background layer for a still image.
 *
 * `next/image` throws at runtime for an absolute URL whose host is not listed in
 * `images.remotePatterns`, and the admin lets an editor paste any URL. Site-relative
 * uploads (the normal case, `/api/media/…`) go through the optimiser; anything
 * external falls back to a plain `img` so a pasted URL degrades to an
 * unoptimised background instead of crashing the page.
 */
function HeroMediaImage({ src, quality }: { src: string; quality: number }) {
  if (src.startsWith('/')) {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        quality={quality}
        className="object-cover"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
  );
}

export default function ServiceHero({
  hero,
  crumbs,
  fallbackEyebrow,
  fallbackHeadline,
  fallbackSubheadline,
}: {
  hero: ServiceHeroContent;
  crumbs: Crumb[];
  fallbackEyebrow?: string;
  fallbackHeadline: string;
  fallbackSubheadline?: string;
}) {
  const eyebrow = hero.eyebrow || fallbackEyebrow || '';
  const headline = hero.headline || fallbackHeadline;
  const subheadline = hero.subheadline || fallbackSubheadline || '';
  const hasMedia = heroHasMedia(hero);
  const centered = hero.align === 'center';

  // Emphasise the final word of the headline, matching the existing pages.
  const words = headline.trim().split(/\s+/);
  const lead = words.slice(0, -1).join(' ');
  const last = words.length > 1 ? words[words.length - 1] : '';

  return (
    <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
      <div className="absolute inset-0 z-0">
        {hero.mediaType === 'image' && hero.imageUrl && (
          <HeroMediaImage src={hero.imageUrl} quality={85} />
        )}

        {hero.mediaType === 'video' && (
          <>
            {/* The poster is the mobile background in its own right, not just a placeholder. */}
            {hero.posterUrl && <HeroMediaImage src={hero.posterUrl} quality={80} />}
            {hero.videoUrl && (
              <video
                className="absolute inset-0 hidden h-full w-full object-cover md:block"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={hero.posterUrl || undefined}
                aria-hidden="true"
                tabIndex={-1}
              >
                <source src={hero.videoUrl} />
              </video>
            )}
          </>
        )}

        {/* Darkening layer. Strength is editor-controlled so any media stays readable. */}
        {hasMedia && (
          <div
            className="absolute inset-0 bg-[var(--navy)]"
            style={{ opacity: hero.overlay / 100 }}
            aria-hidden="true"
          />
        )}
        {hasMedia && (
          <div
            className="absolute inset-0 bg-gradient-to-b from-[var(--navy)]/40 via-transparent to-[var(--navy)]/80"
            aria-hidden="true"
          />
        )}

        {/* Teal accent — the only layer when there is no media. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%), radial-gradient(circle at 80% 80%, var(--teal-deep), transparent 45%)',
          }}
          aria-hidden="true"
        />
      </div>

      <div
        className={`relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-10 md:pb-32 ${
          centered ? 'text-center' : ''
        }`}
      >
        <Breadcrumbs items={crumbs} tone="dark" className={centered ? 'flex justify-center' : ''} />

        <div className={`mt-12 md:mt-16 ${centered ? 'mx-auto max-w-3xl' : ''}`}>
          {eyebrow && (
            <Reveal>
              <div
                className={`mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/90 backdrop-blur-sm`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> {eyebrow}
              </div>
            </Reveal>
          )}

          <Reveal delay={80}>
            <h1 className="text-5xl leading-[1.02] tracking-tight drop-shadow-lg md:text-[5.5rem]">
              {lead}
              {last && (
                <>
                  {lead && <br />}
                  <span className="italic text-[var(--teal)]/90">{last}</span>
                </>
              )}
            </h1>
          </Reveal>

          {subheadline && (
            <Reveal delay={160}>
              <p
                className={`mt-8 text-base leading-relaxed text-[var(--cream)]/80 drop-shadow-md ${
                  centered ? 'mx-auto max-w-2xl' : 'max-w-xl'
                }`}
              >
                {subheadline}
              </p>
            </Reveal>
          )}

          {(hero.ctaLabel || hero.secondaryLabel) && (
            <Reveal delay={240}>
              <div className={`mt-10 flex flex-wrap gap-4 ${centered ? 'justify-center' : ''}`}>
                {hero.ctaLabel && (
                  <Link
                    href={hero.ctaHref || '/contact'}
                    className="rounded-full bg-[var(--teal)] px-8 py-4 text-sm font-semibold text-[var(--navy)] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {hero.ctaLabel}
                  </Link>
                )}
                {hero.secondaryLabel && (
                  <Link
                    href={hero.secondaryHref || '/contact'}
                    className="rounded-full border border-[var(--cream)]/40 px-8 py-4 text-sm font-semibold text-[var(--cream)] backdrop-blur-sm transition-all hover:bg-[var(--cream)]/10"
                  >
                    {hero.secondaryLabel}
                  </Link>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
