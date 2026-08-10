import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main id="main-content" className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">This page doesn&apos;t exist</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            The link may be outdated. Try our services, or get in touch and we&apos;ll point you the right way.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ink-foreground transition hover:opacity-90"
            >
              Back to home
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
            >
              Browse services
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
