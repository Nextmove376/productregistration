import Link from 'next/link';

const SERVICES = [
  { num: '01', title: 'MOHAP / EDE Registration', desc: 'Medical devices, medicines and pharmaceutical approvals.', href: '/services/mohap-registration' },
  { num: '02', title: 'Product Registration', desc: 'Cosmetics, food, supplements â€” Dubai Municipality & ESMA.', href: '/services/product-registration' },
  { num: '03', title: 'Regulatory Approvals', desc: 'Essential certifications and compliance audits.', href: '/services/regulatory-approvals' },
  { num: '04', title: 'Government Services', desc: 'MOFA attestation, PRO services and paperwork done right.', href: '/services/mofa-attestation' },
  { num: '05', title: 'Business Setup', desc: 'Mainland, Freezone â€” SHAMS, Meydan, SPC formation.', href: '/services/business-setup' },
  { num: '06', title: 'Trademark & Drugstore', desc: 'UAE trademark registration and medical drugstore setup.', href: '/services/medical-drugstore' },
];

export default function Services() {
  return (
    <section id="services" className="border-y border-border bg-[var(--cream)] py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">Services</div>
            <h2 className="mt-4 text-4xl md:text-5xl">
              Covering the full spectrum of product registration and business services.
            </h2>
          </div>
          <Link href="/services" className="text-sm underline underline-offset-4">Learn more â†’</Link>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.num} href={s.href} className="group relative flex flex-col justify-between bg-[var(--cream)] p-8 transition-colors hover:bg-background">
              <div className="flex items-start justify-between">
                <span className="font-serif text-sm text-[var(--teal-deep)]">{s.num}</span>
                <span className="text-lg text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1">â†—</span>
              </div>
              <div className="mt-24">
                <h3 className="font-serif text-2xl leading-tight">{s.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
