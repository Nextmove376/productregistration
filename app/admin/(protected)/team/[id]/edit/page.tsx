import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import { requireEditor } from '@/lib/dal';
import TeamForm, { type TeamFormValues } from '@/components/admin/TeamForm';

export const dynamic = 'force-dynamic';

/** The edit route the team list linked to but which never existed (404 on click). */
export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEditor();

  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [rows] = await pool.execute(
    `SELECT id, name, role, bio, linkedin, photo_url, phone, email, whatsapp, sort_order, is_active
       FROM team_members
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  const member = (rows as any[])[0];
  if (!member) notFound();

  const initial: Partial<TeamFormValues> = {
    id: member.id,
    name: member.name ?? '',
    role: member.role ?? '',
    bio: member.bio ?? '',
    linkedin: member.linkedin ?? '',
    photo_url: member.photo_url ?? '',
    phone: member.phone ?? '',
    email: member.email ?? '',
    whatsapp: member.whatsapp ?? '',
    sort_order: member.sort_order ?? 0,
    is_active: member.is_active ? 1 : 0,
  };

  return <TeamForm mode="edit" initial={initial} />;
}
