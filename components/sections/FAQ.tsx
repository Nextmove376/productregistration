'use client';

import Link from 'next/link';
import { useState } from 'react';

const FAQS = [
  { q: 'What documents do I need for product registration?', a: 'Requirements vary by category, but typically include a valid trade license, product artwork, ingredient list, certificate of free sale, GMP certificate, and lab analysis. We audit your file first so nothing gets rejected downstream.' },
  { q: 'How long does MOHAP registration take?', a: 'For medical devices and medicines, expect 8–14 weeks depending on classification and dossier completeness. We prepare the file to minimise back-and-forth with the ministry.' },
  { q: 'Mainland or Freezone — which is right for me?', a: "It depends on where your customers are and what activities you'll perform. We map both scenarios (cost, ownership, visa quota, restrictions) before you commit." },
  { q: 'Will I have a dedicated advisor?', a: "Yes. You're paired with a single point of contact who owns your file end-to-end and stays with you through renewals and future filings." },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="faq-heading">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">FAQ</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Questions, answered plainly.</h2>
          <p className="mt-4 text-sm text-muted-foreground">Common questions from founders and product managers navigating UAE compliance.</p>
          <Link href="/contact" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">Ask something specific →</Link>
        </div>
        <div className="md:col-span-8">
          <ul className="divide-y divide-border border-y border-border" role="list">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              const panelId = `faq-panel-${i}`;
              return (
                <li key={f.q}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="font-display text-base font-semibold sm:text-lg">{f.q}</span>
                    <span aria-hidden="true" className={`text-xl transition-transform ${isOpen ? 'rotate-45' : ''} text-primary`}>+</span>
                  </button>
                  {isOpen && (
                    <p id={panelId} className="pb-5 text-sm leading-relaxed text-muted-foreground md:pr-12">{f.a}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
