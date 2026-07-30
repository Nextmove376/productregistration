'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: FileText, label: 'Blog Posts', href: '/admin/blog' },
  { icon: Users, label: 'Team Members', href: '/admin/team' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white shrink-0">
      <div className="p-4">
        <h2 className="text-xl font-bold">NextMove Admin</h2>
      </div>
      <nav className="mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 ${pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-800"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
