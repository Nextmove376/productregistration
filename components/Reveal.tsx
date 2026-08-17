'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/**
 * Scroll-reveal wrapper.
 *
 * Uses one IntersectionObserver per element and disconnects on first reveal, so
 * a page with dozens of these does no ongoing scroll work. The observer is the
 * only cost — there is no scroll listener.
 *
 * Two deliberate choices:
 *
 *  - The children are always in the server-rendered HTML. Only opacity and
 *    transform change, so crawlers and no-JS readers get the full content.
 *  - `prefers-reduced-motion` is checked before any animation is armed. Those
 *    users get the final state immediately with no transition.
 */

interface RevealProps {
  children: ReactNode;
  /** Stagger in ms. Use the map index for lists. */
  delay?: number;
  /** Direction the element travels from. */
  from?: 'bottom' | 'left' | 'right' | 'none';
  /** Element to render. Defaults to a div. */
  as?: ElementType;
  className?: string;
}

const OFFSETS: Record<NonNullable<RevealProps['from']>, string> = {
  bottom: 'translate3d(0, 24px, 0)',
  left: 'translate3d(-24px, 0, 0)',
  right: 'translate3d(24px, 0, 0)',
  none: 'none',
};

export default function Reveal({
  children,
  delay = 0,
  from = 'bottom',
  as: Tag = 'div',
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    // Honour the OS-level motion preference: skip straight to the final state.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setInstant(true);
      setShown(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Without IntersectionObserver (very old browsers) show everything rather
    // than leaving the page blank.
    if (typeof IntersectionObserver === 'undefined') {
      setInstant(true);
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          observer.disconnect();
        }
      },
      // Fire slightly before the element reaches the viewport so the motion has
      // finished by the time it is properly in view.
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      // Hook for the no-JS override in `app/layout.tsx` — without JavaScript the
      // observer never fires, so the inline `opacity: 0` below would hide the
      // content permanently.
      data-reveal=""
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : OFFSETS[from],
        transition: instant
          ? 'none'
          : 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: instant ? '0ms' : `${delay}ms`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}
