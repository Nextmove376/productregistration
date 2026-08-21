import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Reveal from '@/components/Reveal';
import ServiceHero from '@/components/services/ServiceHero';
import { parseServiceBody } from '@/lib/service-content';
import pool from '@/lib/db';
import type { Metadata } from 'next';

/**
 * ISR floor — see `lib/revalidate.ts`. Admin mutations call `revalidateServices()`
 * for immediate invalidation; this interval is the backstop.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Our Services | Product Registration, Business Setup & More | NextMove",
  description: "Comprehensive regulatory services in Dubai & UAE. Product registration, MOHAP registration, business setup, MOFA attestation, and regulatory approvals. Free consultation.",
  alternates: { canonical: "https://productregistrationinuae.com/services" },
  openGraph: {
    title: "Our Services | Product Registration, Business Setup & More | NextMove",
    description: "Comprehensive regulatory services in Dubai & UAE. Product registration, MOHAP registration, business setup, MOFA attestation, and regulatory approvals.",
    url: "https://productregistrationinuae.com/services",
    type: "website",
    images: ["https://productregistrationinuae.com/api/media/1786744117330-7jeaei.png"],
  },
};

// Static fallback services in case database is not available
const fallbackServices = [
  { slug: "product-registration", title: "Product Registration", tag: "Product Compliance", summary: "Register cosmetics, food, supplements, and consumer products with Dubai Municipality, ESMA, and MOIAT." },
  { slug: "mohap-registration", title: "MOHAP Registration", tag: "Healthcare Regulatory", summary: "Register medical devices, pharmaceuticals, and health products with the UAE Ministry of Health." },
  { slug: "business-setup", title: "Business Setup", tag: "Company Formation", summary: "Mainland, freezone, and offshore company formation in Dubai and the UAE." },
  { slug: "mofa-attestation", title: "MOFA Attestation", tag: "Government Services", summary: "Document attestation, embassy legalization, and PRO services in Dubai." },
  { slug: "medical-drugstore", title: "Medical & Drugstore", tag: "Healthcare Business", summary: "Pharmacy setup, drugstore licensing, and trademark registration." },
  { slug: "regulatory-approvals", title: "Regulatory Approvals", tag: "Compliance & Certification", summary: "ESMA certification, GMP verification, Halal certification, and lab testing." },
];

async function getServices() {
  try {
    const [rows] = await pool.execute(
      `SELECT slug, title, tag, summary, icon
         FROM services
        WHERE is_active = 1 AND deleted_at IS NULL
        ORDER BY sort_order, title`
    );
    const services = rows as any[];
    return services.length > 0 ? services : fallbackServices;
  } catch (error) {
    console.error('Database error:', error);
    return fallbackServices;
  }
}

/**
 * The listing hero runs through the same normaliser the admin-editable single
 * service pages use, so both share one shape and one component. If this hero
 * later needs to be editable too, only this object changes \u2014 swap it for a
 * settings read and the markup below stays as it is.
 */
const LISTING_HERO = {
  mediaType: 'image' as const,
  imageUrl: '/api/media/1786744117330-7jeaei.png',
  overlay: 72,
  eyebrow: 'services',
  headline: 'What we do.',
  subheadline:
    'From product registration to business setup, we handle the regulatory complexity so you can focus on growing your business. Our expert team ensures 98% first-time approval rate across all services.',
  ctaLabel: 'Get Free Assessment',
  ctaHref: '/contact',
  secondaryLabel: 'Call +971 52 910 2088',
  secondaryHref: 'tel:+971529102088',
};

export default async function ServicesPage() {
  const services = await getServices();
  const { hero } = parseServiceBody({ hero: LISTING_HERO });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/*
        The BreadcrumbList JSON-LD that used to be hand-written here now comes
        from <Breadcrumbs> inside the hero, generated from the same array it
        renders \u2014 so the visible trail and the structured data cannot drift.
      */}
      <ServiceHero
        hero={hero}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Services' }]}
        fallbackHeadline={LISTING_HERO.headline}
      />

      {/* Services Grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl md:text-4xl">Our Comprehensive Services</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              We offer end-to-end regulatory solutions for businesses entering or operating in the
              UAE market.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.slug} delay={i * 70}>
              <Link
                href={`/services/${service.slug}`}
                className="group flex h-full flex-col rounded-3xl border border-border bg-[var(--cream)] p-8 transition-all hover:-translate-y-1 hover:border-[var(--teal)]/40 hover:shadow-lg"
              >
                {service.tag && (
                  <div className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">
                    {service.tag}
                  </div>
                )}
                <h3 className="font-serif text-2xl leading-tight transition-colors group-hover:text-[var(--teal-deep)]">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.summary}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--teal-deep)]">
                  Learn more{' '}
                  <span className="transition-transform group-hover:translate-x-1">{'\u2192'}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <Reveal>
            <div className="grid gap-12 md:grid-cols-12 md:items-end">
              <div className="md:col-span-8">
                <h2 className="font-serif text-4xl leading-tight sm:text-5xl sm:leading-[1.02] md:text-7xl">
                  Not sure what you need?
                  <br />
                  <em className="text-[var(--teal)]">We can help.</em>
                </h2>
                <p className="mt-4 max-w-lg text-[var(--cream)]/70">
                  Book a free assessment with our regulatory experts. We will review your
                  requirements and recommend the best approach for your business.
                </p>
              </div>
              <div className="md:col-span-4">
                <Link
                  href="/contact"
                  className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]"
                >
                  <span className="font-serif text-lg">Get Consultation</span>
                  <span className="text-2xl transition-transform group-hover:translate-x-1">
                    {'\u2192'}
                  </span>
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
