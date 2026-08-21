export default function DocumentChecklist({ documents }: { documents: { text: string; required?: boolean }[] }) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-[var(--cream)] p-6">
      <ul className="space-y-3">
        {documents.map((doc, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{doc.text}</span>
            {doc.required === false && <span className="ml-auto shrink-0 text-xs text-muted-foreground">(Optional)</span>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">Don&apos;t have all documents? We can help source and prepare them for you.</p>
    </div>
  );
}
