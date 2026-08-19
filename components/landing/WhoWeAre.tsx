import Link from 'next/link';

export default function WhoWeAre() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="who-we-are">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Who we are</p>
          <h2 id="who-we-are" className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Fast &amp; reliable <em className="not-italic text-primary">product registration</em> and business setup.
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground transition hover:opacity-90">
              Start your registration
            </Link>
            <Link href="/services" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary">
              Our services
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-7 shadow-[var(--shadow-soft)]">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Welcome to Next Move Services — your trusted partner for product registration in Dubai and business setup in the UAE. We help brands secure fast approvals for cosmetics, food, supplements and more, handling everything from label checks to CPRE submission and compliance.
          </p>
          <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-border/70 pt-6">
            {[
              ['500+', 'Brands served'],
              ['8+', 'Regulators'],
              ['48h', 'Avg response'],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-semibold text-primary">{n}</dt>
                <dd className="text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
