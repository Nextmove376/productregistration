import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';
import { hasColumn, selectList, softDeleteFilter } from '@/lib/schema';
import { withSchemaHeal } from '@/lib/schema-repair';
import { logger } from '@/lib/logger';

/**
 * ISR floor. Without a revalidate value this page was prerendered once at build
 * time and never refreshed, so CMS edits never reached the live site. Admin
 * mutations also call `revalidateTeam()` in `lib/revalidate.ts`.
 */
export const revalidate = 300;

/**
 * Reads whichever of these columns the live table has.
 *
 * The hard-coded list previously named `whatsapp` and `deleted_at`, both added long
 * after the production database was created. On a database missing either, this query
 * threw and took the whole public page down with it — a public page must degrade, not
 * 500, when a contact field is absent.
 */
async function getTeamMembers() {
  try {
    return await withSchemaHeal(async () => {
      const columns = await selectList('team_members', [
        'id', 'name', 'role', 'bio', 'linkedin', 'photo_url', 'phone', 'email', 'whatsapp',
      ]);
      const notDeleted = await softDeleteFilter('team_members');
      const activeOnly = (await hasColumn('team_members', 'is_active')) ? ' AND is_active = 1' : '';
      const order = (await hasColumn('team_members', 'sort_order')) ? 'ORDER BY sort_order, name' : 'ORDER BY name';

      const [rows] = await pool.query(
        `SELECT ${columns} FROM team_members
          WHERE 1=1${activeOnly}${notDeleted}
          ${order}`
      );
      return rows as any[];
    });
  } catch (err) {
    logger.error('team.page_query_failed', { err });
    return [] as any[];
  }
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
          <h1 className="text-[2rem] leading-tight tracking-tight sm:text-5xl sm:leading-[1.02] md:text-[6rem]">
            The people behind<br />
            <span className="italic text-[var(--teal)]/90">your success.</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:py-32">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div key={member.name} id={`member-${member.id}`} className="group scroll-mt-28 rounded-3xl border border-border bg-[var(--cream)] p-8 transition-all hover:border-[var(--teal)]/40 hover:shadow-lg">
              {member.photo_url && (
                /*
                 * The worst payload ratio on the site: `photo_url` is an admin upload, so
                 * a 1736x906 portrait was downloaded in full and then painted into a 96px
                 * box. `next/image` with real dimensions asks the optimiser for a 96px
                 * (and 2x) derivative instead, and reserves the box so the card does not
                 * reflow when the photo arrives.
                 */
                <Image
                  src={member.photo_url}
                  alt={member.name}
                  width={96}
                  height={96}
                  sizes="96px"
                  className="mb-6 h-24 w-24 rounded-2xl object-cover"
                />
              )}
              <h3 className="font-serif text-2xl">{member.name}</h3>
              <p className="mt-1 text-sm font-medium text-[var(--teal-deep)]">{member.role}</p>
              {member.bio && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{member.bio}</p>}
              {/* `py-2 text-xs` gave ~32px-tall targets; `min-h-10` and the larger type
                  bring them to 40px, and `flex-wrap` stops three pills from being crushed
                  into one 327px row. */}
              <div className="mt-6 flex flex-wrap gap-3">
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90">LinkedIn</a>
                )}
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-[var(--teal)]/40">Call</a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-[var(--teal)]/40">Email</a>
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
