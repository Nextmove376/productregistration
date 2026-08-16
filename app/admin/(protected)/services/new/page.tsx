import { requireEditor } from '@/lib/dal';
import ServiceForm from '@/components/admin/ServiceForm';

export const dynamic = 'force-dynamic';

export default async function NewServicePage() {
  await requireEditor();
  return <ServiceForm mode="create" />;
}
