'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings, LogOut, Image, Inbox, BarChart3, Menu as MenuIcon, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: FileText, label: 'Blog', href: '/admin/blog' },
  { icon: Users, label: 'Team', href: '/admin/team' },
  { icon: Settings, label: 'Services', href: '/admin/services' },
  { icon: Inbox, label: 'Submissions', href: '/admin/submissions' },
  { icon: Image, label: 'Media', href: '/admin/media' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-gray-900 text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-between p-4">
          {!collapsed && <h2 className="text-lg font-bold">NextMove</h2>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-gray-800" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <nav className="flex-1 mt-2">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-200 bg-white px-2 py-2 md:hidden">
        {menuItems.slice(0, 5).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 text-xs ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 px-3 py-1.5 text-xs text-gray-400">
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </nav>

      {/* Mobile spacer */}
      <div className="h-16 md:hidden" />
    </>
  );
}
