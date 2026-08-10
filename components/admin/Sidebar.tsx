'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings, LogOut, Menu, X, BarChart3, Inbox } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Inbox, label: 'Submissions', href: '/admin/submissions' },
  { icon: FileText, label: 'Blog Posts', href: '/admin/blog' },
  { icon: Users, label: 'Team Members', href: '/admin/team' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function Sidebar({ user }: { user?: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-gray-900 p-4 md:hidden">
        <h2 className="text-lg font-bold text-white">NextMove Admin</h2>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - desktop always visible, mobile overlay */}
      <aside
        className={`${
          mobileOpen ? 'fixed inset-0 z-50 bg-gray-900' : 'hidden'
        } md:relative md:block w-64 bg-gray-900 text-white shrink-0`}
      >
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">NextMove Admin</h2>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} className="text-white p-1 md:hidden" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {user && (
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        )}

        <nav className="mt-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                pathname === item.href ? 'bg-white/10' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
