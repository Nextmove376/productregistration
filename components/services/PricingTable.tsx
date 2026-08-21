export default function PricingTable({ rows }: { rows: { service: string; timeline: string; price: string }[] }) {
  return (
    <div className="mt-8">
      {/*
        `overflow-hidden` was clipping the third column off the right edge on mobile
        instead of letting it scroll: three columns of `px-6` cells need roughly 350px
        and a 375px phone leaves 327px inside the section padding, so the "Starting
        From" price — the number the visitor came for — was simply invisible.

        `overflow-x-auto` plus an explicit `min-w` makes it scroll instead. The min
        width is required: with `w-full` alone the table would obediently squeeze to
        the container and never trigger the scroll, crushing the text instead.

        `tabIndex`/`role`/`aria-label` are what make that scroll container reachable
        without a mouse — a scrollable region that only responds to swipe or drag is a
        WCAG 2.1.1 failure.
      */}
      <div
        className="overflow-x-auto rounded-2xl border border-border"
        tabIndex={0}
        role="region"
        aria-label="Pricing and timelines"
      >
        <table className="w-full min-w-[34rem]">
          <thead className="bg-[var(--navy)] text-[var(--cream)]">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-medium sm:px-6">Service</th>
              <th className="px-4 py-4 text-left text-sm font-medium sm:px-6">Timeline</th>
              <th className="px-4 py-4 text-left text-sm font-medium sm:px-6">Starting From</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-[var(--cream)]">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-4 py-4 text-sm font-medium sm:px-6">{row.service}</td>
                <td className="px-4 py-4 text-sm text-muted-foreground sm:px-6">{row.timeline}</td>
                <td className="px-4 py-4 text-sm font-medium text-[var(--teal-deep)] sm:px-6">{row.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Prices are indicative and vary based on complexity. Contact us for a precise quote.</p>
    </div>
  );
}
