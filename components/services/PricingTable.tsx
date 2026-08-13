export default function PricingTable({ rows }: { rows: { service: string; timeline: string; price: string }[] }) {
  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full">
          <thead className="bg-[var(--navy)] text-[var(--cream)]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium">Service</th>
              <th className="px-6 py-4 text-left text-sm font-medium">Timeline</th>
              <th className="px-6 py-4 text-left text-sm font-medium">Starting From</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-[var(--cream)]">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-6 py-4 text-sm font-medium">{row.service}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{row.timeline}</td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--teal-deep)]">{row.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Prices are indicative and vary based on complexity. Contact us for a precise quote.</p>
    </div>
  );
}
