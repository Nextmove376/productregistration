import Link from 'next/link';
import Image from 'next/image';
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
    images: ["https://productregistrationinuae.com/uploads/1786744117330-7jeaei.png"],
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
      'SELECT slug, title, tag, summary, icon FROM services WHERE is_active = 1 ORDER BY sort_order'
    );
    const services = rows as any[];
    return services.length > 0 ? services : fallbackServices;
  } catch (error) {
    console.error('Database error:', error);
    return fallbackServices;
  }
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
      
      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        {/* Background Image with Next.js Image for optimization */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/uploads/1786744117330-7jeaei.png"
            alt="Dubai regulatory services and product registration"
            fill
            className="object-cover"
            priority={true}
            sizes="100vw"
            quality={85}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy)]/80 via-[var(--navy)]/70 to-[var(--navy)]/90" />
          {/* Teal accent gradient */}
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-24 md:pb-32 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/10 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> services
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem] drop-shadow-lg">
            What we<br /><span className="italic text-[var(--teal)]/90">do.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/80 drop-shadow-md">
            From product registration to business setup, we handle the regulatory complexity so you can focus on growing your business. Our expert team ensures 98% first-time approval rate across all services.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/contact" className="rounded-full bg-[var(--teal)] px-8 py-4 text-sm font-semibold text-[var(--navy)] transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md">
              Get Free Assessment
            </Link>
            <a href="tel:+971529102088" className="rounded-full border border-[var(--cream)]/40 px-8 py-4 text-sm font-semibold text-[var(--cream)] transition-all hover:bg-[var(--cream)]/10 backdrop-blur-sm">
              Call +971 52 910 2088
            </a>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl md:text-4xl">Our Comprehensive Services</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">We offer end-to-end regulatory solutions for businesses entering or operating in the UAE market.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group rounded-3xl border border-border bg-[var(--cream)] p-8 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg hover:-translate-y-1"
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

      {/* CTA Section */}
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
