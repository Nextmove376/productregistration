interface Step { step: number; title: string; description: string; timeline: string; }

export default function ProcessSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="mt-8 space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="relative flex gap-6 pb-8 last:pb-0">
          {i < steps.length - 1 && <div className="absolute left-5 top-10 h-full w-px bg-border" />}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-sm font-bold text-[var(--cream)]">{s.step}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-lg">{s.title}</h3>
              <span className="rounded-full bg-[var(--cream)] px-3 py-0.5 text-xs text-muted-foreground">{s.timeline}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
