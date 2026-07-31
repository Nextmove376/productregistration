import Link from 'next/link';

const POSTS = [
  { tag: 'Guide', title: 'Open a Pharmacy in Dubai UAE: Foreign Investor Guide 2026', read: '12 min read', slug: 'open-a-pharmacy-in-dubai-uae' },
  { tag: 'Playbook', title: 'How to Register a Product in Dubai, UAE: The Complete Step-by-Step Guide (2026)', read: '18 min read', slug: 'how-to-register-a-product-in-dubai' },
  { tag: 'Comparison', title: 'Set Up a Business in Dubai: Mainland vs Free Zone vs Offshore — Complete 2026 Guide', read: '15 min read', slug: 'how-to-set-up-a-business-in-dubai-uae' },
];

export default function Insights() {
  return (
    <section className="bg-sand/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Insights</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Hear directly from our <em className="not-italic text-primary">experts</em>.</h2>
          </div>
          <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">More insights →</Link>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {POSTS.map((p, i) => (
            <Link key={i} href={`/blog/${p.slug}`} className="group grid grid-cols-12 items-center gap-4 py-6 transition-colors hover:bg-card sm:gap-6">
              <span className="col-span-2 font-display text-lg font-semibold text-primary sm:col-span-1">0{i + 1}</span>
              <span className="col-span-3 text-[11px] uppercase tracking-wider text-muted-foreground sm:col-span-2">{p.tag}</span>
              <h3 className="col-span-7 font-display text-base font-semibold leading-tight transition-colors group-hover:text-primary sm:col-span-6 sm:text-lg">{p.title}</h3>
              <span className="col-span-2 hidden text-xs text-muted-foreground sm:block">{p.read}</span>
              <span className="col-span-1 hidden text-right text-lg transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 sm:block">\u2197</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
