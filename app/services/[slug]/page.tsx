import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Reveal from '@/components/Reveal';
import ServiceHero from '@/components/services/ServiceHero';
import OurServices from '@/components/services/OurServices';
import { parseServiceBody } from '@/lib/service-content';
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

/**
 * Runs at build time.
 *
 * A database error here fails the whole build, which is how a pending migration
 * (missing `deleted_at`) took the deploy down. Returning an empty list instead
 * lets the build finish; the pages are then rendered on first request and cached
 * by the ISR setting above, so nothing is permanently lost.
 */
export async function generateStaticParams() {
  try {
    const [rows] = await pool.execute(
      'SELECT slug FROM services WHERE is_active = 1 AND deleted_at IS NULL'
    );
    return (rows as any[]).map((r) => ({ slug: r.slug }));
  } catch (err) {
    console.error('generateStaticParams(services) failed; falling back to on-demand rendering:', err);
    return [];
  }
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

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  // Normalised and fully defaulted \u2014 no optional chaining needed downstream, and
  // a row saved before the hero/ourServices model existed still renders.
  const body = parseServiceBody(service.body);

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: body.breadcrumbLabel || service.title },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <ServiceHero
        hero={body.hero}
        crumbs={crumbs}
        fallbackEyebrow={service.tag || undefined}
        fallbackHeadline={service.title}
        fallbackSubheadline={service.summary || undefined}
      />

      <OurServices content={body.ourServices} />

      {body.sections.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <Reveal from="left">
                <h2 className="font-serif text-4xl leading-tight">What&apos;s included</h2>
              </Reveal>
            </div>
            <div className="md:col-span-7">
              <ul className="grid gap-4 sm:grid-cols-2">
                {body.sections.map((item, i) => (
                  <Reveal key={i} as="li" delay={i * 50}>
                    <div className="flex h-full items-start gap-3 rounded-2xl border border-border bg-[var(--cream)] p-5 text-sm transition-colors hover:border-[var(--teal)]/40">
                      <span className="mt-0.5 text-[var(--teal)]" aria-hidden="true">
                        {'\u2666'}
                      </span>
                      <span>{item}</span>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {body.faq.length > 0 && (
        <section className="border-t border-border bg-[var(--cream)]">
          <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
            <Reveal>
              <h2 className="font-serif text-4xl leading-tight">Frequently Asked Questions</h2>
            </Reveal>
            <div className="mt-12 space-y-4">
              {body.faq.map((item, i) => (
                <Reveal key={i} delay={i * 50}>
                  <details className="group rounded-2xl border border-border bg-white p-6 transition-colors hover:border-[var(--teal)]/40">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg font-medium">
                      {item.q}
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[var(--teal-deep)] transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-4 leading-relaxed text-muted-foreground">{item.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <Reveal>
            <div className="grid gap-12 md:grid-cols-12 md:items-end">
              <div className="md:col-span-8">
                <h2 className="font-serif text-4xl leading-tight sm:text-5xl sm:leading-[1.02] md:text-7xl">
                  Ready to start?<br />
                  <em className="text-[var(--teal)]">Let&apos;s talk.</em>
                </h2>
              </div>
              <div className="md:col-span-4">
                <Link
                  href="/contact"
                  className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]"
                >
                  <span className="font-serif text-lg">Book a free consultation</span>
                  <span className="text-2xl transition-transform group-hover:translate-x-1">{'\u2192'}</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
