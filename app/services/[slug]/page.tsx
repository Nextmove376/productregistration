import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { queryOne } from '@/lib/db';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const BASE_URL = 'https://productregistrationinuae.com';

type Service = {
  id: number;
  slug: string;
  title: string;
  tag: string | null;
  summary: string | null;
  body: string | null;
  icon: string | null;
  hero_image: string | null;
  timeline: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

const FALLBACK_SERVICES: Record<string, Service> = {
  'mohap-registration': {
    id: -1, slug: 'mohap-registration', title: 'MOHAP / EDE Registration', tag: 'Regulatory',
    summary: 'Medical devices, medicines and pharmaceutical dossiers prepared, submitted and shepherded to approval.',
    body: JSON.stringify({ items: ['Class I–IV medical devices', 'Prescription medicines', 'Over-the-counter drugs', 'Establishment licensing', 'Renewals & variations'], time: '8–14 weeks' }),
    icon: null, hero_image: '/images/svc-mohap.jpg', timeline: '8–14 weeks',
    meta_title: 'MOHAP / EDE Registration | Medical Devices & Medicines UAE', meta_description: 'Medical devices, medicines and pharmaceutical dossiers prepared, submitted and approved through MOHAP.',
  },
  'product-registration': {
    id: -2, slug: 'product-registration', title: 'Product Registration', tag: 'Product',
    summary: 'Cosmetics, food, supplements and household goods through Dubai Municipality, ESMA and MOIAT.',
    body: JSON.stringify({ items: ['Cosmetic products (CPRE)', 'Food items', 'Health supplements', 'Biocides & detergents', 'Label & artwork review'], time: '3–8 weeks' }),
    icon: null, hero_image: '/images/svc-product.jpg', timeline: '3–8 weeks',
    meta_title: 'Product Registration Dubai | Cosmetics, Food & Supplements', meta_description: 'Register cosmetics, food, supplements and household goods through Dubai Municipality, ESMA and MOIAT.',
  },
  'regulatory-approvals': {
    id: -3, slug: 'regulatory-approvals', title: 'Regulatory Approvals', tag: 'Compliance',
    summary: 'The certifications and audits your file needs before it ever reaches a regulator.',
    body: JSON.stringify({ items: ['Free-sale certificates', 'GMP verification', 'Lab testing coordination', 'Halal certification', 'ISO alignment'], time: '2–6 weeks' }),
    icon: null, hero_image: '/images/svc-approvals.jpg', timeline: '2–6 weeks',
    meta_title: 'Regulatory Approvals UAE | Certifications & Compliance', meta_description: 'Free-sale certificates, GMP verification, lab testing, halal certification and ISO alignment for UAE market entry.',
  },
  'mofa-attestation': {
    id: -4, slug: 'mofa-attestation', title: 'MOFA & PRO Services', tag: 'Government',
    summary: 'Attestations, translations and public-relations paperwork handled by hand at the counter.',
    body: JSON.stringify({ items: ['MOFA attestation', 'Embassy legalisation', 'Certified translations', 'Visa & Emirates ID', 'Corporate PRO retainer'], time: '1–3 weeks' }),
    icon: null, hero_image: '/images/svc-gov.jpg', timeline: '1–3 weeks',
    meta_title: 'MOFA Attestation & PRO Services UAE', meta_description: 'MOFA attestation, embassy legalisation, certified translations, visa processing and corporate PRO services in UAE.',
  },
  'business-setup': {
    id: -5, slug: 'business-setup', title: 'Business Setup', tag: 'Formation',
    summary: 'Mainland trade licences and freezone company formation — SHAMS, Meydan, SPC and beyond.',
    body: JSON.stringify({ items: ['Mainland trade licence', 'SHAMS freezone', 'Meydan freezone', 'SPC freezone', 'Bank account opening'], time: '1–4 weeks' }),
    icon: null, hero_image: '/images/svc-setup.jpg', timeline: '1–4 weeks',
    meta_title: 'Business Setup Dubai | Mainland & Freezone Formation', meta_description: 'Mainland trade licences and freezone company formation in SHAMS, Meydan, SPC and more. 100% foreign ownership.',
  },
  'medical-drugstore': {
    id: -6, slug: 'medical-drugstore', title: 'Trademark & Drugstore', tag: 'Specialist',
    summary: 'UAE trademark registration and turnkey medical drugstore setup with full compliance stack.',
    body: JSON.stringify({ items: ['UAE trademark filing', 'Trademark opposition', 'Drugstore establishment', 'Pharmacy fit-out advisory', 'Ministry inspections'], time: 'Varies' }),
    icon: null, hero_image: '/images/svc-trademark.jpg', timeline: 'Varies',
    meta_title: 'Trademark Registration & Medical Drugstore Setup UAE', meta_description: 'UAE trademark filing, opposition, and turnkey medical drugstore setup with full compliance stack.',
  },
};

async function getService(slug: string): Promise<Service | null> {
  try {
    const dbService = await queryOne<Service>(
      'SELECT * FROM services WHERE slug = ? AND is_active = 1',
      [slug]
    );
    if (dbService) return dbService;
  } catch {
    // DB unavailable, use fallback
  }
  return FALLBACK_SERVICES[slug] || null;
}

function parseBody(body: string | null): { items?: string[]; time?: string; faq?: Array<{ q: string; a: string }> } {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: 'Service Not Found' };

  const title = service.meta_title || `${service.title} | Next Move Services`;
  const description = service.meta_description || service.summary || '';

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/services/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/services/${slug}`,
      images: service.hero_image ? [{ url: service.hero_image, width: 1200, height: 800 }] : [{ url: '/images/hero-dubai.jpg', width: 1920, height: 1200 }],
    },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const body = parseBody(service.body);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        {service.hero_image && (
          <Image src={service.hero_image} alt={service.title} fill className="object-cover opacity-20" priority />
        )}
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          {service.tag && (
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> {service.tag}
            </div>
          )}
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
            {service.title.split(' ').map((word, i) => i === service.title.split(' ').length - 1 ? (
              <span key={i} className="italic text-[var(--teal)]/90">{word}</span>
            ) : (
              <span key={i}>{word} </span>
            ))}
          </h1>
          {service.summary && (
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/70">
              {service.summary}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="font-serif text-4xl leading-tight">What&apos;s included</h2>
            {service.timeline && (
              <p className="mt-6 text-muted-foreground">Typical timeline: {service.timeline}</p>
            )}
          </div>
          <div className="md:col-span-7">
            {body.items && body.items.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {body.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--cream)] p-5 text-sm">
                    <span className="mt-0.5 text-[var(--teal)]">✦</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Contact us for detailed service information.</p>
            )}
          </div>
        </div>
      </section>

      {/* FAQ if present */}
      {body.faq && body.faq.length > 0 && (
        <section className="border-y border-border bg-[var(--cream)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="font-serif text-4xl md:text-5xl mb-12">Frequently asked</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {body.faq.map((f, i) => (
                <div key={i} className="rounded-2xl border border-border bg-white p-6">
                  <h3 className="font-serif text-lg font-semibold">{f.q}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal)]">Get started</div>
              <h2 className="mt-4 font-serif text-5xl leading-[1.02] md:text-7xl">
                Ready to start?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book a free consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <div className="mt-6 space-y-1 text-sm text-[var(--cream)]/70">
                <div>+971 52 910 2088</div>
                <div>hello@nextmoveservices.ae</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
