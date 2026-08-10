'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Error</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Something went wrong</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Sorry — this page failed to load. Please try again, or call us on{' '}
          <a href="tel:+971529102088" className="font-medium text-primary hover:underline">
            +971 52 910 2088
          </a>
          .
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ink-foreground transition hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
