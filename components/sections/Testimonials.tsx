const REVIEWS = [
  { q: 'Registering our diagnostic equipment with the Department of Health â€“ Abu Dhabi was a critical milestone. Every step handled with accuracy and efficiency.', a: 'Meditech Supplies LLC', when: '1 month ago' },
  { q: 'We had been struggling for months with product registration in Dubai. The team simplified everything and completed approvals ahead of schedule.', a: 'Felix Dermabelle Cosmetics', when: '2 days ago' },
  { q: 'Complex imported food registration handled smoothly. Deep knowledge of Dubai Municipality and ESMA procedures â€” a truly reliable partner.', a: "Al Ru'ya Al Tibbiyya Sweets", when: '2 months ago' },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Testimonials</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">The receipts, from real founders.</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-display text-3xl font-semibold text-primary">5.0</div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Google reviews</div>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {REVIEWS.map((r, i) => (
          <figure key={i} className="flex flex-col justify-between rounded-3xl border border-border/70 bg-card p-7 shadow-[var(--shadow-soft)]">
            <div className="mb-5 flex text-primary">{'â˜…â˜…â˜…â˜…â˜…'}</div>
            <blockquote className="font-display text-base font-semibold leading-relaxed">&ldquo;{r.q}&rdquo;</blockquote>
            <figcaption className="mt-6 border-t border-border/70 pt-4">
              <div className="text-sm font-semibold">{r.a}</div>
              <div className="text-xs text-muted-foreground">{r.when}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
