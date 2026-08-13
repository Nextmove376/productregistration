'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground">Oops</h1>
        <p className="mt-4 text-lg text-muted-foreground">Something went wrong. Please try again.</p>
        <button
          onClick={reset}
          className="mt-8 rounded-full bg-ink px-8 py-3 text-sm font-semibold text-ink-foreground transition hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
