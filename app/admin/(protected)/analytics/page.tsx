import { requireEditor } from '@/lib/dal';
import AnalyticsClient from '@/components/admin/AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  await requireEditor();
  return <AnalyticsClient />;
}
