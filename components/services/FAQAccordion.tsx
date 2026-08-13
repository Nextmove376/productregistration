'use client';
import { useState } from 'react';

export default function FAQAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="mt-8 space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="rounded-2xl border border-border bg-[var(--cream)]">
          <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="flex w-full items-center justify-between p-6 text-left">
            <h3 className="font-serif text-lg pr-4">{faq.question}</h3>
            <svg className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${openIndex === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openIndex === i && (
            <div className="px-6 pb-6">
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
