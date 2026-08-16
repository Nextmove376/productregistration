import { requireEditor } from '@/lib/dal';
import SubmissionsClient from '@/components/admin/SubmissionsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSubmissionsPage() {
  await requireEditor();
  return <SubmissionsClient />;
}
