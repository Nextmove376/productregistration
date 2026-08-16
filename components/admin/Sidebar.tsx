'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  LogOut,
  Image as ImageIcon,
  Inbox,
  BarChart3,
  ChevronLeft,
  MoreHorizontal,
  X,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import type { Role } from '@/lib/auth';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  /** Roles allowed to see this item; omitted means everyone. */
  roles?: Role[];
}

/**
 * Only routes that actually exist are listed here.
 *
 * The previous sidebar was the source of several dead links; keep this list in sync
 * with the pages under `app/admin/(protected)/`. Categories, Menus, Trash and Audit
 * have APIs but no screens yet — add their entries when those pages land.
 */
const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: FileText, label: 'Blog', href: '/admin/blog' },
  // Services previously reused the Settings icon, making the two rows ambiguous.
  { icon: Package, label: 'Services', href: '/admin/services' },
  { icon: Users, label: 'Team', href: '/admin/team' },
  { icon: Inbox, label: 'Submissions', href: '/admin/submissions' },
  { icon: ImageIcon, label: 'Media', href: '/admin/media' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: ShieldCheck, label: 'Users', href: '/admin/users', roles: ['admin'] },
  { icon: Settings, label: 'Settings', href: '/admin/settings', roles: ['admin'] },
];

const COLLAPSE_KEY = 'nm_admin_sidebar_collapsed';
const MOBILE_PRIMARY_COUNT = 4;

interface SidebarProps {
  user: { email: string; role: Role };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // Restore the collapsed preference after mount (avoids a hydration mismatch).
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage unavailable — keep the default */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Close the mobile sheet on navigation.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await api.post('/api/admin/logout');
    } catch {
      // Report it, but still clear the client and leave — staying signed in on a
      // failed logout is the worse outcome.
      setLogoutError('Sign-out request failed; clearing session locally.');
    } finally {
      setLoggingOut(false);
      router.replace('/admin/login');
      router.refresh();
    }
  };

  /**
   * Exact match, or a prefix match that stops at a path separator. Plain
   * `startsWith` made `/admin/blog` light up for `/admin/blogsomething`.
   */
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navLink = (item: NavItem, variant: 'desktop' | 'sheet') => {
    const active = isActive(item.href);
    if (variant === 'sheet') {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
            active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span>{item.label}</span>
        </Link>
      );
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          active
            ? 'bg-white/10 text-white before:absolute before:left-0 before:h-8 before:w-0.5 before:rounded-r before:bg-white relative'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const mobilePrimary = items.slice(0, MOBILE_PRIMARY_COUNT);
  const mobileOverflow = items.slice(MOBILE_PRIMARY_COUNT);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-gray-900 text-white transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          {!collapsed && <h2 className="text-lg font-bold tracking-tight">NextMove</h2>}
          <button
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto">{items.map((item) => navLink(item, 'desktop'))}</nav>

        {/* Signed-in identity — previously the panel never showed who you were. */}
        <div className="border-t border-gray-800 p-3">
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="truncate text-xs font-medium text-white" title={user.email}>
                {user.email}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gray-500">{user.role}</p>
            </div>
          )}
          {logoutError && !collapsed && (
            <p className="mb-2 px-1 text-[11px] text-amber-400">{logoutError}</p>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-60"
          >
            {loggingOut ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <LogOut className="h-5 w-5 shrink-0" />}
            {!collapsed && <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav — overflow goes into a sheet so every item stays reachable */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white px-2 py-2 md:hidden">
        {mobilePrimary.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 text-xs ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1.5 text-xs text-gray-400"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More admin sections">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                <p className="text-xs uppercase tracking-wider text-gray-400">{user.role}</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">{mobileOverflow.map((item) => navLink(item, 'sheet'))}</div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile spacer so content clears the fixed nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}
