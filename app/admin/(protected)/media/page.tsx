import { requireEditor } from '@/lib/dal';
import MediaLibraryClient from '@/components/admin/MediaLibraryClient';

/**
 * Media library route.
 *
 * The screen itself is a Client Component in `components/admin/`, so this file
 * exists to do the two things a client page cannot: check the session server-side
 * before rendering anything, and opt the route out of static prerendering.
 *
 * The guard is deliberately repeated here rather than left to the layout. Layouts
 * do not re-run on client-side navigation between sibling admin routes, so a
 * layout check alone would not catch a session that expired after the shell was
 * rendered. Every other protected page already does this; media was the only one
 * that did not, because it was written as a client page.
 */
export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  await requireEditor();
  return <MediaLibraryClient />;
}
