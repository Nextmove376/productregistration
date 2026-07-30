'use client';

import Link from 'next/link';
import { useState } from 'react';

const SERVICES_LIST = ['Medical Devices', 'Drug Store Setup', 'Cosmetics', 'Health Supplements', 'Food Items', 'Biocides & Detergents', 'MOFA Attestation', 'Freezone Formation', 'Mainland License'];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
      <img src="/images/hero-dubai.jpg" alt="Dubai skyline" width={1920} height={1200} className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy)]/70 via-[var(--navy)]/60 to-[var(--navy)]" />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pb-28 pt-24 md:grid-cols-12 md:pt-32">
        <div className="md:col-span-7">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> from idea to official — simple
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[5.5rem]">
            Product registration<br />
            <span className="italic text-[var(--teal)]/90">& business setup</span><br />
            <span className="text-[var(--cream)]/70">in the UAE.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/70">
            From MOHAP approvals and Dubai Municipality product registration to freezone company formation and PRO services — your end-to-end regulatory partner. Trusted by 500+ local and international brands.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/contact" className="rounded-full bg-[var(--teal)] px-7 py-3.5 text-sm font-medium text-[var(--navy)] transition-transform hover:-translate-y-0.5">
              Start your registration
            </Link>
            <Link href="/services" className="rounded-full border border-[var(--cream)]/30 px-7 py-3.5 text-sm text-[var(--cream)] transition-colors hover:bg-[var(--cream)]/10">
              Explore services
            </Link>
          </div>
          <ul className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-3 text-sm text-[var(--cream)]/80 sm:grid-cols-3">
            {SERVICES_LIST.map((s) => (
              <li key={s} className="flex items-center gap-2 border-t border-[var(--cream)]/10 pt-3">
                <span className="text-[var(--teal)]">✦</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-5">
          <RegisterCard />
        </div>
      </div>
    </section>
  );
}

function RegisterCard() {
  const [sent, setSent] = useState(false);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true); }}
      className="relative rounded-3xl border border-[var(--cream)]/15 bg-[var(--cream)] p-8 text-foreground shadow-2xl md:sticky md:top-28"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">Register Now</div>
          <h3 className="mt-1 font-serif text-2xl">Free consultation</h3>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--navy)] text-[var(--cream)]">→</div>
      </div>
      <div className="space-y-3">
        {['Your name', 'Phone number', 'Email address'].map((p) => (
          <input key={p} placeholder={p} className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-[var(--teal)]" />
        ))}
        <select className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-[var(--teal)]">
          <option>Choose a service…</option>
          <option>Medical Devices & Medicines</option>
          <option>Drug Store Setup</option>
          <option>Cosmetic Products</option>
          <option>Health Supplements</option>
          <option>Food Items Registration</option>
          <option>Biocides & Detergents</option>
        </select>
        <textarea placeholder="Tell us briefly about your project" rows={3} className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-[var(--teal)]" />
      </div>
      <button type="submit" className="mt-5 w-full rounded-xl bg-[var(--navy)] py-3.5 text-sm font-medium text-[var(--cream)] transition-transform hover:-translate-y-0.5">
        {sent ? 'Thanks — we\'ll be in touch' : 'Send'}
      </button>
      <p className="mt-4 text-center text-xs text-muted-foreground">Replies within one business day.</p>
    </form>
  );
}
