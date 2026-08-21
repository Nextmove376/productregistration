import Link from 'next/link';
import Image from 'next/image';

const services = [
  { n: '01', title: 'MOHAP / EDE Registration', desc: 'Medical devices, medicines and pharmaceutical approvals.', img: '/images/svc-mohap.jpg', alt: 'Pharmaceutical packaging prepared for MOHAP registration in the UAE' },
  { n: '02', title: 'Product Registration', desc: 'Cosmetics, food, supplements — Dubai Municipality & ESMA.', img: '/images/svc-product.jpg', alt: 'Cosmetic and supplement products prepared for Dubai Municipality registration' },
  { n: '03', title: 'Regulatory Approvals', desc: 'Essential certifications and compliance audits.', img: '/images/svc-approvals.jpg', alt: 'Official UAE compliance certificate with a teal wax seal' },
  { n: '04', title: 'Government Services', desc: 'MOFA attestation, PRO services and paperwork done right.', img: '/images/svc-gov.jpg', alt: 'UAE government attestation paperwork and stamps on a desk' },
  { n: '05', title: 'Business Setup', desc: 'Mainland, Freezone — SHAMS, Meydan, SPC formation.', img: '/images/svc-setup.jpg', alt: 'Modern Dubai freezone business centre building' },
  { n: '06', title: 'Trademark & Drugstore', desc: 'UAE trademark registration and medical drugstore setup.', img: '/images/svc-trademark.jpg', alt: 'Shelves of medicines inside a licensed Dubai pharmacy' },
];

export default function Services() {
  return (
    <section id="services" className="bg-sand/60 py-20" aria-labelledby="services-heading">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Services</p>
            <h2 id="services-heading" className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Covering the full spectrum of product registration and business services.
            </h2>
          </div>
          <Link href="/services" className="text-sm font-semibold text-primary hover:underline">Learn more →</Link>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.n}>
              <Link href="/services" className="group block h-full overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1.5">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {/* Six cards, each shipping an 800px file into a ~330px mobile card.
                      The parent already fixes the ratio, so `fill` + `sizes` adds a
                      srcset without changing the layout at all. */}
                  <Image
                    src={s.img}
                    alt={s.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-ink-foreground backdrop-blur-sm">
                    {s.n}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Learn more <span className="transition group-hover:translate-x-1">↗</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
