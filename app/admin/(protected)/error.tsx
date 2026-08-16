'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Error boundary for the admin area.
 *
 * Deliberately shows a generic message: `error.message` from a Server Component is
 * already redacted in production by Next, and surfacing raw database or driver text
 * to the browser would leak schema details. The digest is displayed so a specific
 * failure can be correlated with the server logs.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side console only; the server already logged the real cause.
    console.error('Admin route error:', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          This screen failed to load. The error has been logged on the server.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
