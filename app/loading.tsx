/**
 * Route-level loading UI.
 *
 * Next.js streams this instantly on navigation, so a click gives immediate
 * feedback instead of appearing frozen for the ~1.2s it takes the server to
 * respond. This is the main fix for the sluggish click-to-page feel.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="h-12 w-3/4 rounded-2xl bg-slate-200" />
          <div className="h-12 w-1/2 rounded-2xl bg-slate-200" />
          <div className="space-y-3 pt-6">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
            <div className="h-4 w-4/6 rounded bg-slate-100" />
          </div>
          <div className="grid gap-5 pt-10 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        Loading page
      </span>
    </div>
  );
}
