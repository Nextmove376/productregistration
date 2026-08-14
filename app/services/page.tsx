import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Our Services | Product Registration, Business Setup & More | NextMove",
  description: "Comprehensive regulatory services in Dubai & UAE. Product registration, MOHAP registration, business setup, MOFA attestation, and regulatory approvals. Free consultation.",
  alternates: { canonical: "https://productregistrationinuae.com/services" },
  openGraph: {
    title: "Our Services | Product Registration, Business Setup & More | NextMove",
    description: "Comprehensive regulatory services in Dubai & UAE. Product registration, MOHAP registration, business setup, MOFA attestation, and regulatory approvals.",
    url: "https://productregistrationinuae.com/services",
    type: "website",
  },
};

async function getServices() {
  const [rows] = await pool.execute(
    'SELECT slug, title, tag, summary, icon FROM services WHERE is_active = 1 ORDER BY sort_order'
  );
  return rows as any[];
}

export default async function ServicesPage() {
  const services = await getServices();

  // Generate Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://productregistrationinuae.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": "https://productregistrationinuae.com/services"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Header />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> services
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
            What we<br /><span className="italic text-[var(--teal)]/90">do.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/70">
            From product registration to business setup, we handle the regulatory complexity so you can focus on growing your business. Our expert team ensures 98% first-time approval rate across all services.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group rounded-3xl border border-border bg-[var(--cream)] p-8 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg"
            >
              {service.tag && (
                <div className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">{service.tag}</div>
              )}
              <h3 className="font-serif text-2xl leading-tight transition-colors group-hover:text-[var(--teal-deep)]">{service.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{service.summary}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--teal-deep)]">
                Learn more <span className="transition-transform group-hover:translate-x-1">{'\u2192'}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-5xl leading-[1.02] md:text-7xl">
                Not sure what you need?<br /><em className="text-[var(--teal)]">We can help.</em>
              </h2>
              <p className="mt-4 max-w-lg text-[var(--cream)]/70">
                Book a free assessment with our regulatory experts. We will review your requirements and recommend the best approach for your business.
              </p>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Get Consultation</span>
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
