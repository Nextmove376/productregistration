const VALUES = [
  { k: 'Family-Rooted Integrity', v: 'Built on trust and genuine care. Every decision reflects what\'s right.' },
  { k: 'Entrepreneurial Empathy', v: 'We\'ve lived the founder journey and guide as we wish we\'d been guided.' },
  { k: 'End-to-End Reliability', v: 'One-stop support. No confusion, no stress — just dependable execution.' },
  { k: 'Vision of Next Move', v: 'A lifelong partnership that grows with every stage of your success.' },
];

export default function Values() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:py-36">
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">Our values</div>
          <h2 className="mt-4 text-4xl leading-tight md:text-5xl">
            We listen, think independently, advise & <em className="text-[var(--teal-deep)]">take action</em>.
          </h2>
        </div>
        <div className="md:col-span-8">
          <ol className="divide-y divide-border border-y border-border">
            {VALUES.map((v, i) => (
              <li key={v.k} className="grid grid-cols-12 gap-6 py-8">
                <span className="col-span-2 font-serif text-3xl text-[var(--teal-deep)]/60">0{i + 1}</span>
                <h3 className="col-span-4 font-serif text-xl">{v.k}</h3>
                <p className="col-span-6 text-sm leading-relaxed text-muted-foreground">{v.v}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
