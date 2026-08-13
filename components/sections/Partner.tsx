import Link from 'next/link';

export default function Partner() {
  return (
    <section className="border-y border-border bg-sand">
      <div className="mx-auto grid max-w-6xl gap-0 px-0 md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-6 py-20 md:order-1 md:px-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Trusted partner</p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Set up your company with <em className="not-italic text-primary">Meydan Free Zone</em>.
          </h2>
          <p className="mt-6 max-w-lg text-muted-foreground">
            Meydan Free Zone (MFZ) is an economic freezone in the heart of Dubai â€” near landmark commercial developments, hospitals, schools, and entertainment hubs. A prime environment for investors.
          </p>
          <div className="mt-10 flex gap-3">
            <Link href="/contact" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ink-foreground transition hover:opacity-90">Free consultation</Link>
            <Link href="/services/business-setup" className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-secondary">Compare freezones</Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <img src="/images/meydan.jpg" alt="Meydan Free Zone" loading="lazy" width={1600} height={1000} className="h-full min-h-[380px] w-full object-cover" />
        </div>
      </div>
    </section>
  );
}
