export default function WhyChooseUs({ differentiators }: { differentiators: { icon: string; title: string; description: string }[] }) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {differentiators.map((d, i) => (
        <div key={i} className="rounded-2xl border border-border bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--navy)] text-[var(--cream)]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="mt-4 font-serif text-lg">{d.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d.description}</p>
        </div>
      ))}
    </div>
  );
}
