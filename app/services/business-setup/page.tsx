import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Business Setup in UAE | Mainland & Freezone Company Formation',
  description: 'Mainland trade licences and freezone company formation — SHAMS, Meydan, SPC and beyond. 1–4 week typical timeline.',
  alternates: { canonical: 'https://productregistrationinuae.com/services/business-setup' },
  openGraph: {
    title: 'Business Setup in UAE | Next Move Services',
    description: 'Mainland trade licences and freezone company formation in UAE.',
    url: 'https://productregistrationinuae.com/services/business-setup',
    images: [{ url: '/images/svc-setup.jpg', width: 800, height: 600 }],
  },
};

export default function BusinessSetupPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> formation
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
            Business<br />
            <span className="italic text-[var(--teal)]/90">Setup.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/70">
            Mainland trade licences and freezone company formation — SHAMS, Meydan, SPC and beyond.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="font-serif text-4xl leading-tight">What&apos;s included</h2>
            <p className="mt-6 text-muted-foreground">Typical timeline: 1–4 weeks</p>
          </div>
          <div className="md:col-span-7">
            <ul className="grid gap-4 sm:grid-cols-2">
              {['Mainland trade licence', 'SHAMS freezone', 'Meydan freezone', 'SPC freezone', 'Bank account opening'].map((it) => (
                <li key={it} className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--cream)] p-5 text-sm">
                  <span className="mt-0.5 text-[var(--teal)]">✦</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-5xl leading-[1.02] md:text-7xl">
                Ready to start?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book a free consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
