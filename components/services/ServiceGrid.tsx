export default function ServiceGrid({ items }: { items: string[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--cream)] p-5 text-sm">
          <span className="mt-0.5 text-[var(--teal)]">{'\u2666'}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
