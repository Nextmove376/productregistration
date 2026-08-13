'use client';

import Link from 'next/link';
import { useState } from 'react';

const TABS = {
  story: 'Welcome to Next Move Services â€” your trusted partner for product registration in Dubai and business setup in the UAE. We help brands secure fast approvals for cosmetics, food, supplements and more, handling everything from label checks to CPRE submission and compliance.',
  mission: 'Simplify business setup in the UAE and product registration in Dubai through end-to-end, reliable support across all regulatory processes. Remove complexity, reduce delays, empower companies to launch and grow.',
  vision: 'Become the UAE\'s most trusted one-stop solution for business setup and product registration â€” driving client growth through expert guidance, fast approvals, and efficient compliance.',
};

export default function About() {
  const [tab, setTab] = useState<'story' | 'mission' | 'vision'>('story');
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:py-36">
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">Who we are</div>
          <h2 className="mt-4 text-4xl leading-tight md:text-6xl">
            Fast & reliable <em className="text-[var(--teal-deep)]">product registration</em> and business setup.
          </h2>
          <div className="mt-8 flex gap-3">
            <Link href="/contact" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm text-[var(--cream)]">Start your registration</Link>
            <Link href="/services" className="rounded-full border border-border px-6 py-3 text-sm">Our services</Link>
          </div>
        </div>
        <div className="md:col-span-7">
          <div className="mb-6 flex gap-8 border-b border-border">
            {(['story', 'mission', 'vision'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`-mb-px pb-3 text-sm capitalize transition-colors ${tab === t ? 'border-b-2 border-[var(--teal)] text-foreground' : 'text-muted-foreground'}`}>{t}</button>
            ))}
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">{TABS[tab]}</p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8">
            {[['500+', 'Brands served'], ['8+', 'Regulators'], ['48h', 'Avg response']].map(([n, l]) => (
              <div key={l as string}>
                <dt className="font-serif text-4xl text-[var(--teal-deep)]">{n}</dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
