import { requireEditor } from '@/lib/dal';
import TeamListClient from '@/components/admin/TeamListClient';

export const dynamic = 'force-dynamic';

export default async function AdminTeamPage() {
  await requireEditor();
  return <TeamListClient />;
}
