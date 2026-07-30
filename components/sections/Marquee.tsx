const PARTNERS = ['MOHAP', 'EDE', 'Dubai Municipality', 'MOIAT', 'Dubai Tourism', 'Meydan', 'SHAMS', 'SPC'];

export default function Marquee() {
  return (
    <section className="border-y border-border bg-[var(--cream)] py-6 overflow-hidden">
      <div className="flex gap-16 marquee whitespace-nowrap">
        {[...PARTNERS, ...PARTNERS, ...PARTNERS].map((p, i) => (
          <span key={i} className="flex items-center gap-3 font-serif text-xl text-[var(--teal-deep)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> {p}
          </span>
        ))}
      </div>
    </section>
  );
}
