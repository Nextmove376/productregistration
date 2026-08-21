import Link from 'next/link';
import { ArrowUpRight, Shield, Building2, Users, Award, CheckCircle2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const FEATURES = [
  {
    icon: Shield,
    title: 'Comprehensive Product Registration',
    desc: 'From Dubai Municipality approvals to ESMA and MOIAT certifications, we ensure your products meet all regulatory standards across the UAE.',
  },
  {
    icon: Building2,
    title: 'Hassle-Free Business Setup',
    desc: 'Whether it\'s Mainland, Free Zone, or Offshore, we handle end-to-end company formation with fast licensing and documentation.',
  },
  {
    icon: Users,
    title: 'Expert PRO & Government Services',
    desc: 'We manage all your public relations needs — visa applications, labor cards, trade licenses, and more — saving you time and effort.',
  },
  {
    icon: Award,
    title: 'Trusted Local Expertise',
    desc: 'With deep knowledge of UAE regulations and strong ties to local authorities, we simplify complex processes for smooth business operations.',
  },
];

const WHY_US = [
  'Direct relationships with MOHAP, Dubai Municipality, ESMA and MOIAT',
  'Dedicated single-point advisor — no handoffs, no confusion',
  'Transparent pricing with no surprise invoices',
  'Automatic renewal scheduling so you never miss a deadline',
  'Weekly progress updates tracked against your timeline',
  'Free initial consultation — no obligation',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, var(--teal), transparent 45%), radial-gradient(circle at 75% 70%, var(--teal-deep), transparent 50%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-24 md:pb-28 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> who we are
          </div>
          <h1 className="text-[2rem] leading-tight tracking-tight sm:text-5xl sm:leading-[1.02] md:text-[5.5rem]">
            Efficient product registration<br />
            <span className="italic text-[var(--teal)]/90">& company formation</span><br />
            <span className="text-[var(--cream)]/70">you can trust in UAE.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-[var(--cream)]/70">
            Nextmove Services is a Dubai-based regulatory consultancy specialising in product registration, MOHAP approvals, and business setup in UAE.
          </p>
        </div>
      </section>

      {/* About Content */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">About us</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              Trusted product registration & <em className="text-[var(--teal-deep)]">business setup</em> experts in Dubai.
            </h2>
          </div>
          <div className="md:col-span-7 space-y-6 text-muted-foreground">
            <p className="text-lg leading-relaxed">
              Nextmove Services is a Dubai-based regulatory consultancy specialising in product registration, MOHAP approvals, and business setup in UAE. Since our founding, we have helped 500+ local and international brands navigate UAE compliance.
            </p>
            <p>
              From Dubai Municipality product approvals and ESMA certifications to freezone company formation in SHAMS, Meydan, and SPC — we make the process fast, transparent, and stress-free.
            </p>
            <p>
              Based at Iliya Tower, Dubai, our team of regulatory experts is available Saturday to Thursday for a free consultation. We serve as your end-to-end regulatory partner — one file, one owner, zero handoffs.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-[var(--cream)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-0 px-0 md:grid-cols-4">
          {[
            ['500+', 'Brands served'],
            ['8+', 'Regulators'],
            ['48h', 'Avg response'],
            ['98%', 'First-pass approval'],
          ].map(([n, l], i) => (
            <div key={l as string} className={`px-8 py-10 text-center ${i < 3 ? 'border-r border-border' : ''} ${i < 2 ? 'border-b border-border md:border-b-0' : i < 4 ? 'border-b border-border md:border-b-0' : ''}`}>
              <div className="font-serif text-5xl text-[var(--teal-deep)]">{n}</div>
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">What we do</div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">End-to-end regulatory <em className="text-[var(--teal-deep)]">solutions.</em></h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="group rounded-3xl border border-border bg-[var(--cream)] p-8 transition-all hover:border-[var(--teal)]/40 hover:shadow-xl">
              <div className="flex items-start gap-5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--cream)] transition-colors group-hover:bg-[var(--teal)] group-hover:text-[var(--navy)]">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-serif text-sm text-[var(--teal-deep)]/60">0{i + 1}</span>
                  <h3 className="mt-1 font-serif text-xl">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Us */}
      <section className="border-y border-border bg-[var(--cream)]">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 md:grid-cols-2 md:py-32">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">Why us</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              We always put your<br /><em className="text-[var(--teal-deep)]">interests first.</em>
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              Driven by a relentless focus on &ldquo;why,&rdquo; we integrate our services to uncover, design, and deliver the most impactful outcomes for you. Instead of relying on predefined processes, we take a hands-on approach — collaborating closely with your teams to craft practical, end-to-end solutions tailored to your needs.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm text-[var(--cream)]">Free Consultation</Link>
              <Link href="/services" className="rounded-full border border-border px-6 py-3 text-sm">Our Services</Link>
            </div>
          </div>
          <div>
            <ul className="space-y-4">
              {WHY_US.map((item) => (
                <li key={item} className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--teal)]" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Service Links */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-12">
          <h2 className="font-serif text-4xl md:text-5xl">Explore our <em className="text-[var(--teal-deep)]">services.</em></h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'Product Registration', desc: 'Cosmetics, food, supplements — Dubai Municipality & ESMA.', href: '/services/product-registration' },
            { title: 'Medical Drugstore Setup', desc: 'Pharmacy license & MOHAP approvals.', href: '/services/medical-drugstore' },
            { title: 'Business Setup', desc: 'Mainland & Freezone — SHAMS, Meydan, SPC formation.', href: '/services/business-setup' },
            { title: 'MOFA Attestation', desc: 'Document legalization and PRO services.', href: '/services/mofa-attestation' },
          ].map((s) => (
            <Link key={s.title} href={s.href} className="group flex items-center justify-between rounded-2xl border border-border bg-[var(--cream)] p-6 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              <div>
                <h3 className="font-serif text-xl group-hover:text-[var(--teal-deep)] transition-colors">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--teal-deep)]" />
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal)]">Next step</div>
              <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl sm:leading-[1.02] md:text-7xl">
                Ready to make the<br /><em className="text-[var(--teal)]">next move?</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book a free consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <div className="mt-6 space-y-1 text-sm text-[var(--cream)]/70">
                <div>+971 52 910 2088</div>
                <div>registrations@nextmoveservices.ae</div>
                <div>Dubai, United Arab Emirates</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
