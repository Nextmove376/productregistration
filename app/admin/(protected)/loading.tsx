/**
 * Shared loading skeleton for the admin area.
 *
 * There were no loading, error or not-found boundaries anywhere under /admin, so a
 * slow query showed a blank page and a thrown error surfaced Next's default screen.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="h-4 w-64 rounded bg-gray-100" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="h-7 w-7 rounded bg-gray-100" />
            <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-gray-100 px-6 py-4 last:border-0">
            <div className="h-4 w-1/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
