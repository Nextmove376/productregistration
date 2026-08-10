import { getSession } from '@/lib/auth';
import Sidebar from '@/components/admin/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // proxy.ts redirects unauthenticated visitors to /admin/login before they get
  // here, so the only session-less page that renders is the login screen — show
  // it without the admin chrome.
  if (!session) {
    return <div className="min-h-screen bg-neutral-100">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <Sidebar user={{ name: session.name, email: session.email, role: session.role }} />
      <main className="flex-1 overflow-x-auto p-4 pb-24 md:p-8 md:pb-8">{children}</main>
    </div>
  );
}
