'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, ArrowUpRight, Send, CheckCircle2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const TEAM_CONTACTS = [
  { name: 'Maher El Delbani', role: 'Consultant', phone: '+971529102088', display: '+971 52 910 2088' },
  { name: 'Mariam Shana', role: 'Regulatory Affairs Specialist', phone: '+971505363584', display: '+971 50 536 3584' },
  { name: 'Ajin Alex', role: 'Senior Advisor Associate', phone: '+971509707440', display: '+971 50 970 7440' },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, var(--teal), transparent 45%), radial-gradient(circle at 75% 70%, var(--teal-deep), transparent 50%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-24 md:pb-28 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> contact us
          </div>
          <h1 className="text-[2rem] leading-tight tracking-tight sm:text-5xl sm:leading-[1.02] md:text-[5.5rem]">
            Let&apos;s <em className="italic text-[var(--teal)]">connect.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--cream)]/70">
            We look forward to learning about your business goals. Reach out and our expert team will respond within one business day.
          </p>
        </div>
      </section>

      {/* Contact Cards + Form */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left — Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Address Card */}
            <div className="group rounded-3xl border border-border bg-[var(--cream)] p-7 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--cream)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg">Office Address</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Iliya Tower 1, Office# 207, PB#234823, Dubai — UAE</p>
                  <a href="https://maps.app.goo.gl/NpXFyFhTDr2PPqy48" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--teal-deep)] hover:underline">
                    Get directions <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="group rounded-3xl border border-border bg-[var(--cream)] p-7 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--cream)]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg">Call Us</h3>
                  <div className="mt-2 space-y-2">
                    {TEAM_CONTACTS.map((c) => (
                      /* Name+role on the left and the number on the right had ~180px of
                         usable width for ~300px of text at 375px (this card is `p-7` and
                         sits beside a 48px icon), so the two halves wrapped into each
                         other. Stack on mobile, restore the side-by-side row at `sm`.
                         `shrink-0` stops the number itself from being broken up. */
                      <a key={c.phone} href={`tel:${c.phone}`} className="flex flex-col gap-1 rounded-xl border border-transparent px-3 py-2 text-sm transition-all hover:border-border hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{c.role}</span>
                        </div>
                        <span className="shrink-0 text-[var(--teal-deep)]">{c.display}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="group rounded-3xl border border-border bg-[var(--cream)] p-7 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--cream)]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg">Email</h3>
                  <a href="mailto:registrations@nextmoveservices.ae" className="mt-1 block text-sm text-[var(--teal-deep)] hover:underline">registrations@nextmoveservices.ae</a>
                </div>
              </div>
            </div>

            {/* Hours Card */}
            <div className="group rounded-3xl border border-border bg-[var(--cream)] p-7 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--cream)]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg">Working Hours</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Saturday — Thursday: 8:30 AM — 5:30 PM</p>
                  <p className="text-sm text-muted-foreground">Friday: Closed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-[var(--cream)] p-8 md:p-10">
              <div className="mb-8">
                <h2 className="font-serif text-3xl md:text-4xl">Get in Touch</h2>
                <p className="mt-3 text-muted-foreground">
                  Ready to register your product or set up your business in UAE? Fill out the form below and our expert team will get back to you within 24 hours.
                </p>
              </div>

              {sent ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 font-serif text-2xl">Thank you!</h3>
                  <p className="mt-2 text-muted-foreground">We&apos;ll get back to you within one business day.</p>
                  <button onClick={() => setSent(false)} className="mt-6 text-sm text-[var(--teal-deep)] underline underline-offset-4">Send another message</button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Your name</label>
                      <input placeholder="John Doe" className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Email address</label>
                      <input type="email" placeholder="john@example.com" className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]" />
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Phone number</label>
                      <input type="tel" placeholder="+971 50 123 4567" className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Company name</label>
                      <input placeholder="Your company LLC" className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Service needed</label>
                    <select className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]">
                      <option value="">Choose a service…</option>
                      <option>MOHAP / EDE Registration</option>
                      <option>Product Registration</option>
                      <option>Regulatory Approvals</option>
                      <option>MOFA & PRO Services</option>
                      <option>Business Setup</option>
                      <option>Trademark & Drugstore</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Your message</label>
                    <textarea rows={4} placeholder="Tell us briefly about your project…" className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]" />
                  </div>
                  <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--navy)] py-4 text-sm font-medium text-[var(--cream)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <Send className="h-4 w-4" /> Send Message
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Call us at <a href="tel:+971529102088" className="text-[var(--teal-deep)] hover:underline">+971 52 910 2088</a> or fill out our form, and we&apos;ll contact you within one business day.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Map / Location CTA */}
      <section className="border-y border-border bg-[var(--cream)]">
        <div className="mx-auto grid max-w-7xl gap-0 px-0 md:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-16 md:px-16">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal-deep)]">Headquarters</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              NextMove Services
            </h2>
            <p className="mt-2 font-serif text-xl text-muted-foreground">Dubai — UAE</p>
            <p className="mt-4 max-w-md text-muted-foreground">
              Iliya Tower 1, Office#207, PB# 234823, Al Qusais Ind. Third, Dubai
            </p>
            <a href="https://maps.app.goo.gl/NpXFyFhTDr2PPqy48" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--navy)] px-7 py-3.5 text-sm text-[var(--cream)] transition-transform hover:-translate-y-0.5">
              Get directions <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="min-h-[380px] bg-[var(--sand)] flex items-center justify-center">
            <div className="text-center">
              <MapPin className="mx-auto h-12 w-12 text-[var(--teal-deep)]" />
              <p className="mt-4 font-serif text-lg">Iliya Tower 1, Al Qusais</p>
              <p className="text-sm text-muted-foreground">Dubai, United Arab Emirates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule CTA */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal)]">Next step</div>
              <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl sm:leading-[1.02] md:text-7xl">
                Schedule a consultation<br />at your <em className="text-[var(--teal)]">preferred time.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Get Consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
