import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const POSTS = [
  { slug: 'open-a-pharmacy-in-dubai-uae', tag: 'Guide', title: 'Open a Pharmacy in Dubai UAE: Foreign Investor Guide 2026', read: '12 min read', date: 'Jul 20, 2026' },
  { slug: 'how-to-register-a-product-in-dubai', tag: 'Playbook', title: 'How to Register a Product in Dubai, UAE: The Complete Step-by-Step Guide (2026)', read: '18 min read', date: 'Jul 15, 2026' },
  { slug: 'how-to-set-up-a-business-in-dubai-uae', tag: 'Comparison', title: 'Set Up a Business in Dubai: Mainland vs Free Zone vs Offshore — Complete 2026 Guide', read: '15 min read', date: 'Jul 10, 2026' },
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
        <div className="divide-y divide-border border-y border-border">
          {POSTS.map((p, i) => (
            <Link key={i} href={`/blog/${p.slug}`} className="group grid grid-cols-12 items-center gap-6 py-8 transition-colors hover:bg-[var(--cream)]">
              <span className="col-span-1 font-serif text-lg text-[var(--teal-deep)]">0{i + 1}</span>
              <span className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground">{p.tag}</span>
              <h3 className="col-span-5 font-serif text-xl leading-tight transition-colors group-hover:text-[var(--teal-deep)]">{p.title}</h3>
              <span className="col-span-2 text-xs text-muted-foreground">{p.date}</span>
              <span className="col-span-1 text-xs text-muted-foreground">{p.read}</span>
              <span className="col-span-1 text-right text-lg transition-transform group-hover:-translate-y-1 group-hover:translate-x-1">\u2197</span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
