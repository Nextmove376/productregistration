import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Blog & Insights | UAE Product Registration Guides — Next Move Services',
  description: 'Expert guides on product registration in Dubai, MOHAP approvals, business setup, and UAE regulatory compliance. Updated for 2026.',
  alternates: { canonical: 'https://productregistrationinuae.com/blog' },
  openGraph: {
    title: 'Blog & Insights | Next Move Services',
    description: 'Expert guides on product registration, MOHAP approvals, and business setup in UAE.',
    url: 'https://productregistrationinuae.com/blog',
    images: [{ url: '/images/hero-dubai.jpg', width: 1920, height: 1200 }],
  },
};

const POSTS = [
  { slug: 'open-a-pharmacy-in-dubai-uae', tag: 'Guide', title: 'Open a Pharmacy in Dubai UAE: Foreign Investor Guide 2026', read: '12 min read', date: 'Jul 20, 2026', image: '/images/svc-mohap.jpg' },
  { slug: 'how-to-register-a-product-in-dubai', tag: 'Playbook', title: 'How to Register a Product in Dubai, UAE: The Complete Step-by-Step Guide (2026)', read: '18 min read', date: 'Jul 15, 2026', image: '/images/svc-product.jpg' },
  { slug: 'how-to-set-up-a-business-in-dubai-uae', tag: 'Comparison', title: 'Set Up a Business in Dubai: Mainland vs Free Zone vs Offshore — Complete 2026 Guide', read: '15 min read', date: 'Jul 10, 2026', image: '/images/svc-setup.jpg' },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%), radial-gradient(circle at 80% 80%, var(--teal-deep), transparent 45%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> insights
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
            Hear directly from<br />
            <span className="italic text-[var(--teal)]/90">our experts.</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((p, i) => (
            <Link key={i} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-3xl border border-border bg-[var(--cream)] transition-all hover:border-[var(--teal)]/40 hover:shadow-xl">
              <div className="relative h-56 overflow-hidden">
                <Image src={p.image} alt={p.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-[var(--teal)] px-3 py-1 text-xs font-semibold text-[var(--navy)]">{p.tag}</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.date}</span>
                  <span>·</span>
                  <span>{p.read}</span>
                </div>
                <h3 className="mt-3 font-serif text-xl leading-tight transition-colors group-hover:text-[var(--teal-deep)]">{p.title}</h3>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--teal-deep)]">
                  Read article <span className="transition-transform group-hover:translate-x-1">↗</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
