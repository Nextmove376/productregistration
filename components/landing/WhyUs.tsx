'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const words = ["You're Getting", "What It Builds", "The Next Step"];

function useTypewriter() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = words[index];
    const done = !deleting && text === full;
    const cleared = deleting && text === '';
    const delay = done ? 1600 : cleared ? 250 : deleting ? 45 : 85;

    const t = setTimeout(() => {
      if (done) return setDeleting(true);
      if (cleared) {
        setDeleting(false);
        setIndex((i) => (i + 1) % words.length);
        return;
      }
      setText(deleting ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1));
    }, delay);

    return () => clearTimeout(t);
  }, [text, deleting, index]);

  return text;
}

export default function WhyUs() {
  const typed = useTypewriter();

  return (
    <section className="relative isolate overflow-hidden py-20" aria-labelledby="why-us-heading">
      <img
        src="/images/why-us.jpg"
        alt="Consultant advising a client about UAE product registration in a Dubai office"
        width={1920}
        height={1088}
        loading="lazy"
        decoding="async"
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink/60 via-ink/25 to-transparent" />

      <div className="mx-auto max-w-6xl px-5">
        <div className="glass-panel max-w-lg rounded-[2rem] p-8 sm:p-10">
          <span className="inline-flex rounded-full border border-border/60 bg-white/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Why us?
          </span>
          <h2 id="why-us-heading" className="mt-6 text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
            You&apos;ll Know What
            <span className="mt-2 block">
              <span className="inline-block rounded-md bg-primary px-2 py-1 text-primary-foreground">
                {typed || '\u00A0'}
                <span className="caret ml-0.5 inline-block w-[2px] align-middle text-primary-foreground">|</span>
              </span>
            </span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            We&apos;re transparent like that. No gimmicks, no surprise invoices â€” just clear scopes, honest timelines, and a single owner on your file.
          </p>
          <Link
            href="/contact"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ink-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Schedule a Call <span aria-hidden="true">â†’</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
