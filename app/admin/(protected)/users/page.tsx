import { requireAdminRole } from '@/lib/dal';
import UsersClient from '@/components/admin/UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await requireAdminRole();
  return <UsersClient currentUserId={session.userId} />;
}
