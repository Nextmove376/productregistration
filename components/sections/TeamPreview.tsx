import Link from 'next/link';

const TEAM = [
  { name: 'Mariam Shana', role: 'Regulatory Affairs Specialist', initials: 'MS' },
  { name: 'Ajin Alex', role: 'Senior Advisor Associate', initials: 'AA' },
  { name: 'Maher El Delbani', role: 'Public Relations Manager', initials: 'MD' },
];

export default function TeamPreview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:py-36">
      <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">Our team</div>
          <h2 className="mt-4 text-4xl md:text-5xl">Meet the experts <em className="text-[var(--teal-deep)]">who make it happen</em>.</h2>
        </div>
        <div className="flex gap-3">
          <Link href="/team" className="rounded-full bg-[var(--navy)] px-5 py-2.5 text-sm text-[var(--cream)]">View all</Link>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {TEAM.map((t, i) => (
          <article key={t.name} className={`group relative overflow-hidden rounded-3xl border border-border p-8 transition-transform hover:-translate-y-1 ${i === 1 ? 'bg-[var(--navy)] text-[var(--cream)]' : 'bg-[var(--cream)]'}`}>
            <div className={`grid h-24 w-24 place-items-center rounded-full font-serif text-3xl ${i === 1 ? 'bg-[var(--teal)] text-[var(--navy)]' : 'bg-[var(--navy)] text-[var(--cream)]'}`}>
              {t.initials}
            </div>
            <h3 className="mt-10 font-serif text-2xl">{t.name}</h3>
            <p className={`mt-1 text-sm ${i === 1 ? 'text-[var(--cream)]/70' : 'text-muted-foreground'}`}>{t.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
