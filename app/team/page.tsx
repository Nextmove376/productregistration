import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Our Team | Next Move Services — UAE Regulatory Experts',
  description: 'Meet the regulatory affairs specialists, advisors, and PRO service experts behind Next Move Services in Dubai.',
  alternates: { canonical: 'https://productregistrationinuae.com/team' },
  openGraph: {
    title: 'Our Team | Next Move Services',
    description: 'Meet the regulatory affairs specialists behind Next Move Services in Dubai.',
    url: 'https://productregistrationinuae.com/team',
    images: [{ url: '/images/hero-dubai.jpg', width: 1920, height: 1200 }],
  },
};

const TEAM = [
  { name: 'Mariam Shana', role: 'Regulatory Affairs Specialist', initials: 'MS', bio: 'Expert in Dubai Municipality product registration and CPRE submissions. Handles cosmetics, food, and supplement approvals.' },
  { name: 'Ajin Alex', role: 'Senior Advisor Associate', initials: 'AA', bio: 'Specializes in MOHAP medical device registration and freezone company formation. 10+ years in UAE compliance.' },
  { name: 'Maher El Delbani', role: 'Public Relations Manager', initials: 'MD', bio: 'Leads government relations and PRO services. Expert in MOFA attestation and embassy legalization.' },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%), radial-gradient(circle at 80% 80%, var(--teal-deep), transparent 45%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> our team
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
            Meet the experts<br />
            <span className="italic text-[var(--teal)]/90">who make it happen.</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-8 md:grid-cols-3">
          {TEAM.map((t, i) => (
            <article key={t.name} className={`group overflow-hidden rounded-3xl border border-border p-8 transition-transform hover:-translate-y-1 ${i === 1 ? 'bg-[var(--navy)] text-[var(--cream)]' : 'bg-[var(--cream)]'}`}>
              <div className={`grid h-24 w-24 place-items-center rounded-full font-serif text-3xl ${i === 1 ? 'bg-[var(--teal)] text-[var(--navy)]' : 'bg-[var(--navy)] text-[var(--cream)]'}`}>
                {t.initials}
              </div>
              <h3 className="mt-10 font-serif text-2xl">{t.name}</h3>
              <p className={`mt-1 text-sm ${i === 1 ? 'text-[var(--cream)]/70' : 'text-muted-foreground'}`}>{t.role}</p>
              <p className={`mt-4 text-sm leading-relaxed ${i === 1 ? 'text-[var(--cream)]/60' : 'text-muted-foreground'}`}>{t.bio}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-5xl leading-[1.02] md:text-7xl">
                Want to join<br /><em className="text-[var(--teal)]">our team?</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Get in touch</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">\u2192</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
