import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Services | Product Registration, MOHAP, Business Setup in UAE',
  description: 'Six practice areas under one roof: MOHAP registration, product registration, regulatory approvals, MOFA attestation, business setup, and trademark services in UAE.',
  alternates: { canonical: 'https://productregistrationinuae.com/services' },
  openGraph: {
    title: 'Services | Next Move Services',
    description: 'MOHAP registration, product registration, regulatory approvals, business setup and more in UAE.',
    url: 'https://productregistrationinuae.com/services',
    images: [{ url: '/images/hero-dubai.jpg', width: 1920, height: 1200 }],
  },
};

const CATEGORIES = [
  {
    num: '01', tag: 'Regulatory', title: 'MOHAP / EDE Registration',
    desc: 'Medical devices, medicines and pharmaceutical dossiers prepared, submitted and shepherded to approval.',
    items: ['Class I–IV medical devices', 'Prescription medicines', 'Over-the-counter drugs', 'Establishment licensing', 'Renewals & variations'],
    time: '8–14 weeks', slug: 'mohap-registration',
  },
  {
    num: '02', tag: 'Product', title: 'Product Registration',
    desc: 'Cosmetics, food, supplements and household goods through Dubai Municipality, ESMA and MOIAT.',
    items: ['Cosmetic products (CPRE)', 'Food items', 'Health supplements', 'Biocides & detergents', 'Label & artwork review'],
    time: '3–8 weeks', slug: 'product-registration',
  },
  {
    num: '03', tag: 'Compliance', title: 'Regulatory Approvals',
    desc: 'The certifications and audits your file needs before it ever reaches a regulator.',
    items: ['Free-sale certificates', 'GMP verification', 'Lab testing coordination', 'Halal certification', 'ISO alignment'],
    time: '2–6 weeks', slug: 'regulatory-approvals',
  },
  {
    num: '04', tag: 'Government', title: 'MOFA & PRO Services',
    desc: 'Attestations, translations and public-relations paperwork handled by hand at the counter.',
    items: ['MOFA attestation', 'Embassy legalisation', 'Certified translations', 'Visa & Emirates ID', 'Corporate PRO retainer'],
    time: '1–3 weeks', slug: 'mofa-attestation',
  },
  {
    num: '05', tag: 'Formation', title: 'Business Setup',
    desc: 'Mainland trade licences and freezone company formation — SHAMS, Meydan, SPC and beyond.',
    items: ['Mainland trade licence', 'SHAMS freezone', 'Meydan freezone', 'SPC freezone', 'Bank account opening'],
    time: '1–4 weeks', slug: 'business-setup',
  },
  {
    num: '06', tag: 'Specialist', title: 'Trademark & Drugstore',
    desc: 'UAE trademark registration and turnkey medical drugstore setup with full compliance stack.',
    items: ['UAE trademark filing', 'Trademark opposition', 'Drugstore establishment', 'Pharmacy fit-out advisory', 'Ministry inspections'],
    time: 'Varies', slug: 'medical-drugstore',
  },
];

const PROCESS = [
  { s: 'Consult', d: 'A 30-minute call to understand your product, market and timeline.' },
  { s: 'Audit', d: 'We map your file against the exact regulator checklist — gaps flagged upfront.' },
  { s: 'Prepare', d: 'Dossiers, translations, artwork and certificates assembled to submission standard.' },
  { s: 'Submit', d: 'Filed with the right authority through the right channel, tracked daily.' },
  { s: 'Approve', d: 'Objections handled, approvals delivered, renewals scheduled.' },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%), radial-gradient(circle at 80% 80%, var(--teal-deep), transparent 45%)' }} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-24 md:grid-cols-12 md:pt-32">
          <div className="md:col-span-8">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> services
            </div>
            <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
              Every filing.<br />
              <span className="italic text-[var(--teal)]/90">Every regulator.</span><br />
              <span className="text-[var(--cream)]/70">Under one roof.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/70">
              Six practice areas, one file owner, zero handoffs. From dossier audit to approved certificate — we run the full compliance stack for brands entering and scaling in the UAE.
            </p>
          </div>
          <div className="md:col-span-4 md:pt-16">
            <ul className="space-y-3 border-t border-[var(--cream)]/15 pt-6 text-sm text-[var(--cream)]/80">
              {CATEGORIES.map((c) => (
                <li key={c.num} className="flex items-center justify-between">
                  <Link href={`/services/${c.slug}`} className="hover:text-[var(--cream)]">{c.title}</Link>
                  <span className="text-[var(--cream)]/40">{c.num}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="space-y-6">
          {CATEGORIES.map((c, i) => (
            <article key={c.num} id={c.num} className={`group grid grid-cols-1 gap-8 rounded-3xl border border-border p-8 md:grid-cols-12 md:p-12 ${i % 2 === 1 ? 'bg-[var(--cream)]' : 'bg-background'}`}>
              <div className="md:col-span-1">
                <div className="font-serif text-4xl text-[var(--teal-deep)]">{c.num}</div>
              </div>
              <div className="md:col-span-5">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">{c.tag}</div>
                <h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">{c.title}</h2>
                <p className="mt-4 text-muted-foreground">{c.desc}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link href="/contact" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm text-[var(--cream)]">Request scope</Link>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Typical timeline · {c.time}</span>
                </div>
              </div>
              <div className="md:col-span-6">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {c.items.map((it) => (
                    <li key={it} className="flex items-start gap-3 border-t border-border pt-3 text-sm">
                      <span className="mt-1 text-[var(--teal)]">✦</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="border-y border-border bg-[var(--cream)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 grid gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">How we work</div>
              <h2 className="mt-4 text-4xl leading-tight md:text-5xl">Five steps. One <em className="text-[var(--teal-deep)]">owner</em>. No handoffs.</h2>
            </div>
            <p className="text-muted-foreground md:col-span-6 md:col-start-7">
              The same advisor stays with your file from the first call to the approved certificate — and through every renewal after.
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-5">
            {PROCESS.map((p, i) => (
              <li key={p.s} className="flex flex-col justify-between bg-[var(--cream)] p-6">
                <div className="font-serif text-3xl text-[var(--teal-deep)]/60">0{i + 1}</div>
                <div className="mt-10">
                  <h3 className="font-serif text-xl">{p.s}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Compare */}
      <Compare />

      {/* CTA */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal)]">Get started</div>
              <h2 className="mt-4 text-5xl leading-[1.02] md:text-7xl">
                Tell us the goal —<br /><em className="text-[var(--teal)]">we&apos;ll scope the path.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book a free consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">\u2192</span>
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

function Compare() {
  const rows = [
    ['Regulator relationships', 'Direct', 'Through agents'],
    ['Dossier audit before filing', 'Included', 'Extra fee'],
    ['Dedicated advisor', 'Yes, always', 'Rotating team'],
    ['Renewal scheduling', 'Automatic', 'Client-tracked'],
    ['Turnaround updates', 'Weekly, tracked', 'Ad-hoc'],
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">The difference</div>
          <h2 className="mt-4 text-4xl leading-tight md:text-5xl">Why founders switch to Nextmove.</h2>
          <img src="/images/doc-seal.jpg" alt="Teal wax seal" loading="lazy" width={1200} height={1400} className="mt-8 hidden rounded-3xl object-cover md:block" />
        </div>
        <div className="md:col-span-7">
          <div className="overflow-hidden rounded-3xl border border-border">
            <div className="grid grid-cols-12 bg-[var(--navy)] px-6 py-4 text-xs uppercase tracking-wider text-[var(--cream)]/70">
              <div className="col-span-6">Criteria</div>
              <div className="col-span-3 text-[var(--teal)]">Nextmove</div>
              <div className="col-span-3">Typical agent</div>
            </div>
            {rows.map(([k, a, b], i) => (
              <div key={k} className={`grid grid-cols-12 items-center px-6 py-5 text-sm ${i % 2 === 0 ? 'bg-background' : 'bg-[var(--cream)]'}`}>
                <div className="col-span-6 font-serif text-base">{k}</div>
                <div className="col-span-3 font-medium text-[var(--teal-deep)]">{a}</div>
                <div className="col-span-3 text-muted-foreground">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
