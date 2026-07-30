import Link from 'next/link';

export default function ContactCta() {
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground" aria-labelledby="cta-heading">
      <div className="float-slow pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sand/10 blur-3xl" />
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Next step</p>
            <h2 id="cta-heading" className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-5xl md:text-6xl">
              Ready to make the<br /><em className="not-italic text-primary">next move?</em>
            </h2>
          </div>
          <div className="md:col-span-4">
            <Link href="/contact" className="group flex items-center justify-between rounded-full bg-primary px-7 py-4 text-primary-foreground shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5">
              <span className="font-display text-base font-semibold">Book a free consultation</span>
              <span className="text-xl transition-transform group-hover:translate-x-1">\u2192</span>
            </Link>
            <div className="mt-5 space-y-1 text-sm text-ink-foreground/70">
              <a href="tel:+971529102088" className="block transition hover:text-ink-foreground">+971 52 910 2088</a>
              <a href="mailto:hello@nextmoveservices.ae" className="block transition hover:text-ink-foreground">hello@nextmoveservices.ae</a>
              <div>Dubai, United Arab Emirates</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
