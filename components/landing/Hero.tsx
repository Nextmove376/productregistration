'use client';

import { useState, useRef } from 'react';

const chips = ['Medical Devices', 'Drug Store Setup', 'Cosmetics', 'Health Supplements', 'Food Items', 'Freezone Formation'];

export default function Hero() {
  const [sent, setSent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section className="relative isolate overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/images/hero-dubai.jpg"
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink/90 via-ink/70 to-ink/40" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="rise-in max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-foreground/85 backdrop-blur-md">
            From idea to official — simple
          </span>
          <h1 className="mt-5 text-3xl font-semibold leading-[1.1] text-ink-foreground sm:text-4xl lg:text-[2.9rem]">
            Product registration &amp; business setup in the UAE.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-foreground/75 sm:text-base">
            From MOHAP approvals and Dubai Municipality product registration to freezone company formation and PRO services — your end-to-end regulatory partner. Trusted by 500+ brands.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#contact" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5">
              Start your registration
            </a>
            <a href="#services" className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-ink-foreground transition hover:bg-white/10">
              Explore services
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-foreground/70">
            {chips.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <span className="text-primary">✦</span> {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm" id="contact">
          <div className="float-slow pointer-events-none absolute -left-10 -top-10 -z-10 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 -z-10 h-44 w-44 rounded-full bg-sand/50 blur-3xl" />
          <div className="glass-panel relative overflow-hidden rounded-[1.75rem] p-6">
            <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--sand)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle cx="330" cy="60" r="120" fill="url(#g1)" />
              <circle cx="60" cy="340" r="140" fill="url(#g1)" />
              <path d="M-20 300 C 120 240, 260 340, 420 250" stroke="var(--primary)" strokeOpacity="0.25" fill="none" />
            </svg>
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Register now</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Free consultation</h2>
              <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <input required placeholder="Full name" className="h-11 w-full rounded-xl border border-border/70 bg-white/70 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25" />
                <input required type="email" placeholder="Email address" className="h-11 w-full rounded-xl border border-border/70 bg-white/70 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25" />
                <input required placeholder="Phone / WhatsApp" className="h-11 w-full rounded-xl border border-border/70 bg-white/70 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25" />
                <select required defaultValue="" className="h-11 w-full rounded-xl border border-border/70 bg-white/70 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25">
                  <option value="" disabled>Choose a service…</option>
                  <option>Medical Devices &amp; Medicines</option>
                  <option>Drug Store Setup</option>
                  <option>Cosmetic Products</option>
                  <option>Health Supplements</option>
                  <option>Food Items Registration</option>
                  <option>Biocides &amp; Detergents</option>
                </select>
                <button type="submit" className="h-11 w-full rounded-xl bg-ink text-sm font-semibold text-ink-foreground transition hover:opacity-90">
                  {sent ? "Thank you — we'll be in touch" : "Send"}
                </button>
              </form>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Replies within one business day.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
