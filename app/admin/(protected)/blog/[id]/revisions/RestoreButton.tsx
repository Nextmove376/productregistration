'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';

interface RestoreButtonProps {
  postId: number;
  revisionId: number;
  revisionNumber: number;
}

/**
 * Restores one revision.
 *
 * A client component only because the page needs a confirm step and a POST; the rest
 * of the history screen stays a Server Component. `confirm()` matches the other admin
 * lists (`BlogListClient`, `ServiceListClient`) — there is no shared `ConfirmDialog`
 * in `components/admin/ui/` to reuse.
 *
 * `router.refresh()` re-runs the server page so the just-created "restored from #n"
 * revision appears without a manual reload.
 */
export default function RestoreButton({ postId, revisionId, revisionNumber }: RestoreButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleRestore = async () => {
    if (
      !confirm(
        `Restore revision #${revisionNumber}? The current version is saved as a new revision first, so you can undo this.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/admin/blog/${postId}/revisions/${revisionId}`, { action: 'restore' });
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRestore}
        disabled={busy || pending}
        className="flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        title={`Restore revision #${revisionNumber}`}
      >
        {busy || pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        Restore
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
