import Sidebar from '@/components/admin/Sidebar';
import { requireSession } from '@/lib/dal';

/**
 * Authenticated admin shell.
 *
 * `force-dynamic` matters here: without it Next would try to prerender these
 * routes at build time. That is exactly how the dashboard ended up as a static
 * HTML file containing real submission data, served to anyone who asked.
 *
 * The `requireSession()` call below is defence in depth, not the only gate —
 * layouts do not re-run on every client-side navigation, so each page performs
 * its own check as well.
 */
export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={{ email: session.email, role: session.role }} />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
