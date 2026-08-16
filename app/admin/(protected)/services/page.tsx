import { requireEditor } from '@/lib/dal';
import ServiceListClient from '@/components/admin/ServiceListClient';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  await requireEditor();
  return <ServiceListClient />;
}
