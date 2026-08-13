import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-ink-foreground/10 bg-ink text-ink-foreground/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Nextmove Services" className="h-9 w-auto brightness-0 invert" />
          </Link>
          <p className="mt-4 max-w-xs text-sm">From idea to official {'\u2014'} simple. UAE product registration and business setup.</p>
        </div>
        {[
          { h: 'Services', l: [{ label: 'Product Registration', href: '/services/product-registration' }, { label: 'MOHAP / EDE', href: '/services/mohap-registration' }, { label: 'Business Setup', href: '/services/business-setup' }, { label: 'MOFA Attestation', href: '/services/mofa-attestation' }] },
          { h: 'Company', l: [{ label: 'About', href: '/about' }, { label: 'Team', href: '/team' }, { label: 'Blog', href: '/blog' }, { label: 'Contact', href: '/contact' }] },
          { h: 'Contact', l: [{ label: '+971 52 910 2088', href: 'tel:+971529102088' }, { label: 'registrations@nextmoveservices.ae', href: 'mailto:registrations@nextmoveservices.ae' }, { label: 'Dubai, UAE', href: '/contact' }, { label: 'WhatsApp us', href: 'https://wa.me/971529102088' }] },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-foreground">{c.h}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {c.l.map((x) => <li key={x.label}><Link href={x.href} className="transition hover:text-ink-foreground">{x.label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-ink-foreground/50">
          <div>{'\u00A9'} {new Date().getFullYear()} Nextmove Services. All rights reserved.</div>
          <div>Registered in the United Arab Emirates</div>
        </div>
      </div>
    </footer>
  );
}
