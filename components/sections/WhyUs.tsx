import Link from 'next/link';
import Image from 'next/image';

export default function WhyUs() {
  return (
    <section className="relative overflow-hidden bg-[var(--navy)] py-28 text-[var(--cream)] md:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal)]">Why us</div>
          <h2 className="mt-4 text-4xl leading-[1.05] md:text-6xl">
            You&apos;ll always know<br />
            <span className="italic text-[var(--cream)]/60">what you&apos;re getting,</span><br />
            what it builds, and the<br />
            next step to take.
          </h2>
          <p className="mt-8 max-w-md text-[var(--cream)]/70">
            We&apos;re transparent like that. No gimmicks, no surprise invoices — just clear scopes, honest timelines, and a single owner on your file.
          </p>
          <Link href="/contact" className="mt-10 inline-block rounded-full bg-[var(--teal)] px-7 py-3.5 text-sm font-medium text-[var(--navy)]">
            Schedule a call →
          </Link>
        </div>
        <div className="relative">
          <Image src="/images/doc-seal.jpg" alt="Official teal wax seal" width={1200} height={1400} className="rounded-3xl object-cover shadow-2xl" />
          <div className="absolute -bottom-6 -left-6 rounded-2xl bg-[var(--cream)] p-5 text-foreground shadow-xl">
            <div className="font-serif text-3xl text-[var(--teal-deep)]">98%</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">First-pass approval</div>
          </div>
        </div>
      </div>
    </section>
  );
}
