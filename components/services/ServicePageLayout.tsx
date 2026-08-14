import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/services/Breadcrumb';
import ProcessSteps from '@/components/services/ProcessSteps';
import ServiceGrid from '@/components/services/ServiceGrid';
import DocumentChecklist from '@/components/services/DocumentChecklist';
import PricingTable from '@/components/services/PricingTable';
import WhyChooseUs from '@/components/services/WhyChooseUs';
import FAQAccordion from '@/components/services/FAQAccordion';
import RelatedServices from '@/components/services/RelatedServices';
import StickyMobileCTA from '@/components/services/StickyMobileCTA';

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

export default function ServicePageLayout({ data }: { data: ServicePageData }) {
  const baseUrl = 'https://productregistrationinuae.com';
  
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

  // Generate Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": `${baseUrl}/services`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": data.serviceName,
        "item": data.canonicalUrl
      }
    ]
  };

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />
      <StickyMobileCTA serviceName={data.serviceName} />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Breadcrumb items={[{ label: 'Services', href: '/services' }, { label: data.title }]} />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> {data.tag}
          </div>
          <h1 className="text-4xl leading-[1.02] tracking-tight md:text-[4.5rem]">{data.title}</h1>
          <p className="mt-4 text-lg font-medium text-[var(--teal)]">{data.subtitle}</p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--cream)]/70">{data.heroDescription}</p>
          {data.trustBadge && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-2 text-sm text-[var(--cream)]/80">
              <svg className="h-4 w-4 text-[var(--teal)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {data.trustBadge}
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={`/contact?service=${encodeURIComponent(data.serviceName)}`} className="rounded-full bg-[var(--teal)] px-8 py-4 text-sm font-semibold text-[var(--navy)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
              Get Free Assessment
            </Link>
            <a href="tel:+971529102088" className="rounded-full border border-[var(--cream)]/30 px-8 py-4 text-sm font-semibold text-[var(--cream)] transition-all hover:bg-[var(--cream)]/10">
              Call +971 52 910 2088
            </a>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-[var(--cream)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 py-8 md:justify-between">
          <div className="flex items-center gap-8">
            <img src="/logos/mohap-1.svg" alt="MOHAP Logo" className="h-8 w-auto opacity-60 grayscale" />
            <img src="/logos/DRUG.svg" alt="Dubai Municipality Logo" className="h-8 w-auto opacity-60 grayscale" />
            <img src="/logos/67da7400f25dbf4c5bb11dc0_Meydan-FZ.webp" alt="Meydan Free Zone Logo" className="h-8 w-auto opacity-60 grayscale" />
            <img src="/logos/SPCFZ-Sharjah.png" alt="Sharjah Free Zone Logo" className="h-8 w-auto opacity-60 grayscale hidden md:block" />
          </div>
          <div className="flex flex-wrap items-center gap-8 text-center">
            <div><p className="text-2xl font-bold text-[var(--navy)]">98%</p><p className="text-xs text-muted-foreground">Success Rate</p></div>
            <div><p className="text-2xl font-bold text-[var(--navy)]">500+</p><p className="text-xs text-muted-foreground">Products Registered</p></div>
            <div><p className="text-2xl font-bold text-[var(--navy)]">15+</p><p className="text-xs text-muted-foreground">Years Experience</p></div>
          </div>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-16">
            {/* What is this service? */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">What is {data.serviceName}?</h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{data.whatIs}</p>
            </div>

            {/* Why is it important? */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Why is {data.serviceName} Important?</h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{data.whyImportant}</p>
            </div>

            {/* Who should use this service? */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Who Should Use {data.serviceName}?</h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{data.whoShouldUse}</p>
            </div>

            {/* Our Services */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Our {data.serviceName} Services</h2>
              <ServiceGrid items={data.included} />
            </div>

            {/* Process */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">{data.serviceName} Process & Timeline</h2>
              <ProcessSteps steps={data.process} />
            </div>

            {/* Requirements */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">{data.serviceName} Requirements</h2>
              <DocumentChecklist documents={data.documents} />
            </div>

            {/* Pricing */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">{data.serviceName} Pricing</h2>
              <PricingTable rows={data.pricing} />
            </div>

            {/* Case Study */}
            {data.caseStudy && (
              <div>
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
              </div>
            )}

            {/* FAQ */}
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Frequently Asked Questions</h2>
              <FAQAccordion faqs={data.faq} />
            </div>
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
          <h2 className="font-serif text-3xl leading-tight md:text-4xl">Related Services</h2>
          <RelatedServices services={data.relatedServices} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-4xl leading-[1.02] md:text-6xl">
                Ready to get started?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
              <p className="mt-4 max-w-lg text-[var(--cream)]/70">Book a free assessment. We&apos;ll review your requirements and provide a detailed timeline and quote within 24 hours.</p>
            </div>
            <div className="md:col-span-4">
              <Link href={`/contact?service=${encodeURIComponent(data.serviceName)}`} className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book Free Assessment</span>
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

