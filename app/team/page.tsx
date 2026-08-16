import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';

/**
 * ISR floor. Without a revalidate value this page was prerendered once at build
 * time and never refreshed, so CMS edits never reached the live site. Admin
 * mutations also call `revalidateTeam()` in `lib/revalidate.ts`.
 */
export const revalidate = 300;

async function getTeamMembers() {
  const [rows] = await pool.execute(
    `SELECT name, role, bio, linkedin, photo_url, phone, email, whatsapp
       FROM team_members
      WHERE is_active = 1 AND deleted_at IS NULL
      ORDER BY sort_order, name`
  );
  return rows as any[];
}

export default async function TeamPage() {
  const members = await getTeamMembers();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> our team
          </div>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-[6rem]">
            The people behind<br />
            <span className="italic text-[var(--teal)]/90">your success.</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div key={member.name} className="group rounded-3xl border border-border bg-[var(--cream)] p-8 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              {member.photo_url && (
                <img src={member.photo_url} alt={member.name} className="mb-6 h-24 w-24 rounded-2xl object-cover" />
              )}
              <h3 className="font-serif text-2xl">{member.name}</h3>
              <p className="mt-1 text-sm font-medium text-[var(--teal-deep)]">{member.role}</p>
              {member.bio && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{member.bio}</p>}
              <div className="mt-6 flex gap-3">
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-ink-foreground hover:opacity-90">LinkedIn</a>
                )}
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:border-[var(--teal)]/40">Call</a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:border-[var(--teal)]/40">Email</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
