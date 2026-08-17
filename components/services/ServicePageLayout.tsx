import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Reveal from '@/components/Reveal';
import ServiceHero from '@/components/services/ServiceHero';
import LogoTicker from '@/components/services/LogoTicker';
import OurServices from '@/components/services/OurServices';
import ProcessSteps from '@/components/services/ProcessSteps';
import DocumentChecklist from '@/components/services/DocumentChecklist';
import PricingTable from '@/components/services/PricingTable';
import FAQAccordion from '@/components/services/FAQAccordion';
import RelatedServices from '@/components/services/RelatedServices';
import StickyMobileCTA from '@/components/services/StickyMobileCTA';
import pool from '@/lib/db';
import { EMPTY_SERVICE_BODY, parseServiceBody, type ServiceBody } from '@/lib/service-content';

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  timeline: string;
}

export interface Document {
  text: string;
  required?: boolean;
}

export interface PricingRow {
  service: string;
  timeline: string;
  price: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface RelatedService {
  slug: string;
  title: string;
  summary: string;
  tag: string;
}

export interface ServicePageData {
  tag: string;
  title: string;
  subtitle: string;
  heroDescription: string;
  trustBadge?: string;
  overview: string;
  whatIs: string;
  whyImportant: string;
  whoShouldUse: string;
  process: ProcessStep[];
  included: string[];
  documents: Document[];
  pricing: PricingRow[];
  differentiators: { icon: string; title: string; description: string }[];
  caseStudy?: { title: string; problem: string; solution: string; result: string; quote?: string; client?: string };
  faq: FAQ[];
  relatedServices: RelatedService[];
  serviceName: string;
  canonicalUrl: string;
  targetCountries?: string[];
}

/**
 * Admin overrides for one of these pages.
 *
 * The six service pages under `app/services/<slug>/` are hand-authored for SEO,
 * so their long-form copy stays in the page file. What an editor needs to change
 * — hero background image or video, the "Our Services" cards, the logo strip —
 * lives in the `services.body` JSON column and is merged in here.
 *
 * Deliberately fail-safe: a missing row, an unmigrated column or an unreachable
 * database yields the empty body and the page renders exactly as it did before.
 * These pages must never go down because the CMS is having a bad day.
 */
async function getOverrides(slug: string): Promise<ServiceBody> {
  if (!slug) return EMPTY_SERVICE_BODY;
  try {
    const [rows] = await pool.execute(
      'SELECT body FROM services WHERE slug = ? LIMIT 1',
      [slug]
    );
    const row = (rows as { body?: unknown }[])[0];
    return row ? parseServiceBody(row.body) : EMPTY_SERVICE_BODY;
  } catch (err) {
    console.error(`ServicePageLayout: could not load overrides for "${slug}":`, err);
    return EMPTY_SERVICE_BODY;
  }
}

/** Last path segment of the canonical URL, e.g. …/services/business-setup → business-setup. */
function slugFromCanonical(url: string): string {
  return url.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? '';
}

export default async function ServicePageLayout({
  data,
  slug,
}: {
  data: ServicePageData;
  /** Overrides the slug used to look up admin content. Defaults to the canonical URL's. */
  slug?: string;
}) {
  const baseUrl = 'https://productregistrationinuae.com';
  const body = await getOverrides(slug ?? slugFromCanonical(data.canonicalUrl));

  /*
   * The "Our Services" section. When an editor has added cards they win; until
   * then the page's own `included` list is mapped into the same shape, so all six
   * pages get the redesigned section immediately rather than only after someone
   * fills in the admin.
   */
  const ourServices = {
    ...body.ourServices,
    heading: body.ourServices.heading || `Our ${data.serviceName} Services`,
    items:
      body.ourServices.items.length > 0
        ? body.ourServices.items
        : data.included.map((title) => ({
            title,
            description: '',
            icon: '',
            imageUrl: '',
            href: '',
            badge: '',
          })),
  };

  // Generate Service Schema
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": data.serviceName,
    "description": data.overview,
    "provider": {
      "@type": "ProfessionalService",
      "name": "NextMove Services",
      "url": baseUrl
    },
    "areaServed": data.targetCountries?.map(c => ({ "@type": "Country", "name": c })) || [
      { "@type": "Country", "name": "UAE" },
      { "@type": "Country", "name": "Pakistan" },
      { "@type": "Country", "name": "India" },
      { "@type": "Country", "name": "Qatar" },
      { "@type": "Country", "name": "Bangladesh" },
      { "@type": "Country", "name": "Sri Lanka" },
      { "@type": "Country", "name": "UK" },
      { "@type": "Country", "name": "China" }
    ],
    "serviceType": data.tag,
    "url": `${baseUrl}/services/${data.serviceName.toLowerCase().replace(/\s+/g, '-')}`
  };

  // The BreadcrumbList JSON-LD that used to be built here is now emitted by
  // <Breadcrumbs> from the same array it renders, so the trail a visitor sees and
  // the markup a crawler reads cannot drift apart.

  // Generate FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": data.faq.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />
      <StickyMobileCTA serviceName={data.serviceName} />

      {/*
        Hero. The background image or video, the overlay strength and every line
        of copy come from the admin panel when set; otherwise the page's own
        values are used, so a service nobody has edited yet looks unchanged.
      */}
      <ServiceHero
        hero={body.hero}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: body.breadcrumbLabel || data.title },
        ]}
        fallbackEyebrow={data.tag}
        fallbackHeadline={data.title}
        fallbackSubheadline={data.subtitle}
      >
        <div>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--cream)]/70">
            {data.heroDescription}
          </p>
          {data.trustBadge && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-2 text-sm text-[var(--cream)]/80">
              <svg className="h-4 w-4 text-[var(--teal)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {data.trustBadge}
            </div>
          )}
        </div>
      </ServiceHero>

      {/* Logo strip: actually animated now, in full colour, and uniformly sized. */}
      <LogoTicker content={body.logos} />

      {/* Stats. These previously shared a cramped row with the static logos. */}
      <section className="border-b border-border bg-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 pb-10">
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-10 text-center sm:gap-16">
              <div><p className="text-2xl font-bold text-[var(--navy)]">98%</p><p className="text-xs text-muted-foreground">Success Rate</p></div>
              <div><p className="text-2xl font-bold text-[var(--navy)]">500+</p><p className="text-xs text-muted-foreground">Products Registered</p></div>
              <div><p className="text-2xl font-bold text-[var(--navy)]">15+</p><p className="text-xs text-muted-foreground">Years Experience</p></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/*
        "Our Services" — redesigned, full-width, and editable. Promoted out of the
        narrow sidebar column it used to share, so the cards get real room.
      */}
      <OurServices content={ourServices} />

      {/* Main Content with Sidebar */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-16">
            {/* What is this service? */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">What is {data.serviceName}?</h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{data.whatIs}</p>
            </Reveal>

            {/* Why is it important? */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Why is {data.serviceName} Important?</h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{data.whyImportant}</p>
            </Reveal>

            {/* Who should use this service? */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Who Should Use {data.serviceName}?</h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{data.whoShouldUse}</p>
            </Reveal>

            {/* Process */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">{data.serviceName} Process & Timeline</h2>
              <ProcessSteps steps={data.process} />
            </Reveal>

            {/* Requirements */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">{data.serviceName} Requirements</h2>
              <DocumentChecklist documents={data.documents} />
            </Reveal>

            {/* Pricing */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">{data.serviceName} Pricing</h2>
              <PricingTable rows={data.pricing} />
            </Reveal>

            {/* Case Study */}
            {data.caseStudy && (
              <Reveal>
                <h2 className="font-serif text-3xl leading-tight md:text-4xl">Success Story</h2>
                <div className="mt-8 rounded-2xl border border-border bg-[var(--cream)] p-8">
                  <h3 className="font-serif text-2xl">{data.caseStudy.title}</h3>
                  <div className="mt-6 space-y-4">
                    <div><h4 className="text-sm font-semibold text-[var(--teal)]">Challenge</h4><p className="mt-1 text-muted-foreground">{data.caseStudy.problem}</p></div>
                    <div><h4 className="text-sm font-semibold text-[var(--teal)]">Solution</h4><p className="mt-1 text-muted-foreground">{data.caseStudy.solution}</p></div>
                    <div><h4 className="text-sm font-semibold text-[var(--teal)]">Result</h4><p className="mt-1 text-muted-foreground">{data.caseStudy.result}</p></div>
                  </div>
                  {data.caseStudy.quote && (
                    <blockquote className="mt-6 border-l-4 border-[var(--teal)] pl-4 italic text-muted-foreground">
                      "{data.caseStudy.quote}"
                      {data.caseStudy.client && <footer className="mt-2 not-italic text-sm font-medium">— {data.caseStudy.client}</footer>}
                    </blockquote>
                  )}
                </div>
              </Reveal>
            )}

            {/* FAQ */}
            <Reveal>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Frequently Asked Questions</h2>
              <FAQAccordion faqs={data.faq} />
            </Reveal>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="sticky top-8 space-y-8">
              {/* Quick Contact */}
              <div className="rounded-2xl border border-border bg-[var(--cream)] p-6">
                <h3 className="font-serif text-xl">Get Free Assessment</h3>
                <p className="mt-2 text-sm text-muted-foreground">Let us review your requirements and provide a detailed quote.</p>
                <Link href={`/contact?service=${encodeURIComponent(data.serviceName)}`} className="mt-4 block w-full rounded-full bg-[var(--teal)] px-6 py-3 text-center text-sm font-semibold text-[var(--navy)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  Book Now
                </Link>
              </div>

              {/* Why Choose Us */}
              <div className="rounded-2xl border border-border bg-[var(--cream)] p-6">
                <h3 className="font-serif text-xl">Why Choose NextMove</h3>
                <ul className="mt-4 space-y-3">
                  {data.differentiators.slice(0, 3).map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--teal)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      <span>{d.title}: {d.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other Services */}
              <div className="rounded-2xl border border-border bg-[var(--cream)] p-6">
                <h3 className="font-serif text-xl">Other Services</h3>
                <ul className="mt-4 space-y-2">
                  {data.relatedServices.map((service, i) => (
                    <li key={i}>
                      <Link href={`/services/${service.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--teal)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
                        {service.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Info */}
              <div className="rounded-2xl border border-border bg-[var(--cream)] p-6">
                <h3 className="font-serif text-xl">Contact Us</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <a href="tel:+971529102088" className="flex items-center gap-2 text-muted-foreground hover:text-[var(--teal)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    +971 52 910 2088
                  </a>
                  <a href="mailto:registrations@nextmoveservices.ae" className="flex items-center gap-2 text-muted-foreground hover:text-[var(--teal)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    registrations@nextmoveservices.ae
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Related Services */}
      <section className="border-t border-border bg-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <Reveal>
            <h2 className="font-serif text-3xl leading-tight md:text-4xl">Related Services</h2>
            <RelatedServices services={data.relatedServices} />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <Reveal className="md:col-span-8">
              <h2 className="font-serif text-4xl leading-[1.02] md:text-6xl">
                Ready to get started?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
              <p className="mt-4 max-w-lg text-[var(--cream)]/70">Book a free assessment. We&apos;ll review your requirements and provide a detailed timeline and quote within 24 hours.</p>
            </Reveal>
            <Reveal className="md:col-span-4" delay={120}>
              <Link href={`/contact?service=${encodeURIComponent(data.serviceName)}`} className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book Free Assessment</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">{'\u2192'}</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

