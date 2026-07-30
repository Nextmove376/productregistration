'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/admin/login') return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.replace('/admin/login');
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-4 md:p-8 bg-gray-100 overflow-x-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminGuard>{children}</AdminGuard>
    </SessionProvider>
  );
}
