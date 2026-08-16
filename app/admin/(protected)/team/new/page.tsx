import { requireEditor } from '@/lib/dal';
import TeamForm from '@/components/admin/TeamForm';

export const dynamic = 'force-dynamic';

export default async function NewTeamMemberPage() {
  await requireEditor();
  return <TeamForm mode="create" />;
}
