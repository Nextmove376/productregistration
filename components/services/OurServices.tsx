import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  Globe,
  Package,
  ScrollText,
  ShieldCheck,
  Stamp,
  Stethoscope,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import type { OurServiceItem, OurServicesContent } from '@/lib/service-content';

/**
 * The "Our Services" section on a single service page.
 *
 * Content, heading, layout and column count all come from the `body.ourServices`
 * JSON, so this is edited entirely from the admin panel — adding a card is a
 * repeater row, not a code change.
 *
 * Icons are resolved from a fixed map rather than a dynamic import: a lookup
 * table only bundles the icons actually listed here, whereas indexing into the
 * whole lucide package would pull every icon into the client bundle.
 */

const ITEM_ICONS: Record<string, LucideIcon> = {
  Package,
  ShieldCheck,
  Building2,
  FileCheck,
  Stethoscope,
  Stamp,
  Globe,
  Briefcase,
  Award,
  ClipboardCheck,
  ScrollText,
  Truck,
  CheckCircle2,
};

const COLUMN_CLASS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

function ItemIcon({ name, className }: { name: string; className: string }) {
  const Icon = ITEM_ICONS[name];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden="true" />;
}

/** Wraps in a Link only when the editor supplied a destination. */
function ItemShell({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

function GridCard({ item, index }: { item: OurServiceItem; index: number }) {
  return (
    <Reveal delay={index * 70}>
      <ItemShell
        href={item.href}
        className="group flex h-full flex-col rounded-3xl border border-border bg-[var(--cream)] p-7 transition-all hover:-translate-y-1 hover:border-[var(--teal)]/40 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          {item.icon ? (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--navy)]/5 text-[var(--teal-deep)] transition-colors group-hover:bg-[var(--teal)]/15">
              <ItemIcon name={item.icon} className="h-5 w-5" />
            </span>
          ) : (
            <span className="text-[var(--teal)]" aria-hidden="true">
              {'♦'}
            </span>
          )}
          {item.badge && (
            <span className="rounded-full bg-[var(--navy)]/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--teal-deep)]">
              {item.badge}
            </span>
          )}
        </div>

        <h3 className="mt-5 font-serif text-xl leading-tight transition-colors group-hover:text-[var(--teal-deep)]">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
        {item.href && (
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--teal-deep)]">
            Learn more
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        )}
      </ItemShell>
    </Reveal>
  );
}

function ListRow({ item, index }: { item: OurServiceItem; index: number }) {
  return (
    <Reveal delay={index * 60}>
      <ItemShell
        href={item.href}
        className="group flex items-start gap-5 rounded-2xl border border-border bg-[var(--cream)] p-6 transition-all hover:border-[var(--teal)]/40 hover:shadow-md"
      >
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--navy)]/5 text-[var(--teal-deep)] transition-colors group-hover:bg-[var(--teal)]/15">
          {item.icon ? <ItemIcon name={item.icon} className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg leading-snug transition-colors group-hover:text-[var(--teal-deep)]">
              {item.title}
            </h3>
            {item.badge && (
              <span className="rounded-full bg-[var(--navy)]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--teal-deep)]">
                {item.badge}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          )}
        </div>
        {item.href && (
          <ArrowUpRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-[var(--teal-deep)] opacity-0 transition-all group-hover:opacity-100" />
        )}
      </ItemShell>
    </Reveal>
  );
}

/** Alternating image/text rows — for a small number of substantial entries. */
function FeatureRow({ item, index }: { item: OurServiceItem; index: number }) {
  const flip = index % 2 === 1;
  return (
    <Reveal from={flip ? 'right' : 'left'}>
      <div className="grid items-center gap-8 md:grid-cols-12">
        <div className={`md:col-span-5 ${flip ? 'md:order-2' : ''}`}>
          {item.imageUrl ? (
            <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-border bg-[var(--cream)] text-[var(--teal-deep)]">
              {item.icon ? <ItemIcon name={item.icon} className="h-12 w-12" /> : null}
            </div>
          )}
        </div>
        <div className={`md:col-span-7 ${flip ? 'md:order-1' : ''}`}>
          {item.badge && (
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">{item.badge}</div>
          )}
          <h3 className="font-serif text-2xl leading-tight md:text-3xl">{item.title}</h3>
          {item.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{item.description}</p>
          )}
          {item.href && (
            <Link
              href={item.href}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--teal-deep)] hover:underline"
            >
              Learn more <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </Reveal>
  );
}

export default function OurServices({ content }: { content: OurServicesContent }) {
  // Nothing configured for this service — render nothing rather than an empty shell.
  if (content.items.length === 0) return null;

  const heading = content.heading || 'Our services';

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="mb-14 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--teal-deep)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> what we deliver
            </div>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">{heading}</h2>
            {content.subheading && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{content.subheading}</p>
            )}
          </div>
        </Reveal>

        {content.layout === 'feature' ? (
          <div className="space-y-16 md:space-y-24">
            {content.items.map((item, i) => (
              <FeatureRow key={`${item.title}-${i}`} item={item} index={i} />
            ))}
          </div>
        ) : content.layout === 'list' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {content.items.map((item, i) => (
              <ListRow key={`${item.title}-${i}`} item={item} index={i} />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 ${COLUMN_CLASS[content.columns] ?? COLUMN_CLASS[3]}`}>
            {content.items.map((item, i) => (
              <GridCard key={`${item.title}-${i}`} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
