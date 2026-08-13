import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-ink px-8 py-3 text-sm font-semibold text-ink-foreground transition hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
