import Link from 'next/link';

export default function RelatedServices({ services }: { services: { slug: string; title: string; summary: string; tag: string }[] }) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-2xl border border-border bg-white p-6 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">{s.tag}</div>
          <h3 className="mt-3 font-serif text-xl transition-colors group-hover:text-[var(--teal-deep)]">{s.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.summary}</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--teal-deep)]">Learn more <span className="transition-transform group-hover:translate-x-1">{'\u2192'}</span></div>
        </Link>
      ))}
    </div>
  );
}
