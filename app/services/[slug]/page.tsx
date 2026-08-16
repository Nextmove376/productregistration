import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';

/**
 * ISR floor. `generateStaticParams` below prerenders the known slugs at build
 * time; this makes those pages refresh afterwards instead of being frozen until
 * the next deploy. Admin mutations also call `revalidateServices()`.
 */
export const revalidate = 300;

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

async function getService(slug: string) {
  const [rows] = await pool.execute(
    'SELECT * FROM services WHERE slug = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1',
    [slug]
  );
  return (rows as any[])[0] || null;
}

export async function generateStaticParams() {
  const [rows] = await pool.execute('SELECT slug FROM services WHERE is_active = 1 AND deleted_at IS NULL');
  return (rows as any[]).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: 'Service Not Found' };

  return {
    title: service.meta_title || `${service.title} | NextMove Services`,
    description: service.meta_description || service.summary,
    openGraph: {
      title: service.meta_title || service.title,
      description: service.meta_description || service.summary,
      images: service.og_image ? [service.og_image] : undefined,
    },
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const body = service.body ? (typeof service.body === 'string' ? JSON.parse(service.body) : service.body) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          {service.tag && (
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> {service.tag}
            </div>
          )}
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[5.5rem]">
            {service.title.split(' ').map((word: string, i: number) => (
              i === service.title.split(' ').length - 1
                ? <span key={i} className="italic text-[var(--teal)]/90">{word}</span>
                : <span key={i}>{word} </span>
            ))}
          </h1>
          {service.summary && (
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/70">{service.summary}</p>
          )}
        </div>
      </section>

      {body?.sections && (
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="font-serif text-4xl leading-tight">What&apos;s included</h2>
            </div>
            <div className="md:col-span-7">
              <ul className="grid gap-4 sm:grid-cols-2">
                {body.sections.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--cream)] p-5 text-sm">
                    <span className="mt-0.5 text-[var(--teal)]">{'\u2666'}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {body?.faq && body.faq.length > 0 && (
        <section className="border-t border-border bg-[var(--cream)]">
          <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
            <h2 className="font-serif text-4xl leading-tight">Frequently Asked Questions</h2>
            <div className="mt-12 space-y-6">
              {body.faq.map((item: { q: string; a: string }, i: number) => (
                <details key={i} className="group rounded-2xl border border-border bg-white p-6">
                  <summary className="cursor-pointer font-serif text-lg font-medium">{item.q}</summary>
                  <p className="mt-4 text-muted-foreground leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-5xl leading-[1.02] md:text-7xl">
                Ready to start?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book a free consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">{'\u2192'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
