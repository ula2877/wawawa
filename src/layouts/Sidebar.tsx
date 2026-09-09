import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  Users,
  UserRound,
  FileText,
  MessageSquare,
  ListOrdered,
  FileClock,
  BarChart3,
  FileBarChart,
  UsersRound,
  Activity,
  Settings as SettingsIcon,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/utils/format';
import { useSidebarStore } from '@/store/sidebarStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
      { label: 'Campaigns', to: '/campaigns', icon: Send },
      { label: 'Contacts', to: '/contacts', icon: Users },
      { label: 'Contact Groups', to: '/contact-groups', icon: UserRound },
      { label: 'Templates', to: '/templates', icon: FileText },
    ],
  },
  {
    title: 'WhatsApp',
    items: [
      { label: 'WhatsApp Accounts', to: '/whatsapp-accounts', icon: MessageSquare },
      { label: 'Message Queue', to: '/message-queue', icon: ListOrdered },
      { label: 'Message Logs', to: '/message-logs', icon: FileClock },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Analytics', to: '/analytics', icon: BarChart3 },
      { label: 'Reports', to: '/reports', icon: FileBarChart },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Team', to: '/team', icon: UsersRound },
      { label: 'Activity Logs', to: '/activity-logs', icon: Activity },
    ],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: SettingsIcon }],
  },
];

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cx('flex items-center gap-2.5', collapsed && 'justify-center')}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-whatsapp-500 shadow-sm">
        <MessageSquare className="h-5 w-5 text-white" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-surface-900 dark:text-surface-100">WhatsApp Blast</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-surface-400">Dashboard</p>
        </div>
      )}
    </div>
  );
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cx('px-4 pb-4 pt-5', collapsed && 'px-3')}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className={cx('scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3', collapsed && 'px-2')} aria-label="Sidebar navigation">
        {NAV.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cx(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-whatsapp-500/10 text-whatsapp-700 dark:bg-whatsapp-500/15 dark:text-whatsapp-400'
                          : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cx(
                            'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
                            isActive ? 'bg-whatsapp-500 opacity-100' : 'opacity-0',
                          )}
                        />
                        <item.icon className={cx('h-[18px] w-[18px] shrink-0', isActive ? 'text-whatsapp-600 dark:text-whatsapp-400' : '')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-100 p-3 dark:border-surface-800">
        <div className={cx('flex items-center gap-2.5', collapsed && 'flex-col')}>
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            title={collapsed ? user?.name : undefined}
          >
            <Avatar name={user?.name ?? 'User'} color={user?.avatarColor} size="sm" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{user?.name ?? 'User'}</p>
                <p className="truncate text-[11px] text-surface-400">{user?.role ?? 'Member'}</p>
              </div>
            )}
          </NavLink>
          {!collapsed ? (
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const closeMobile = useSidebarStore((s) => s.closeMobile);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-surface-200 bg-white transition-all duration-200 dark:border-surface-800 dark:bg-surface-900',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-7 flex h-6 w-6 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-400 shadow-sm transition-colors hover:text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:hover:text-surface-200"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm" onClick={closeMobile} />
          <div className="animate-slide-in-right fixed inset-y-0 left-0 flex w-72 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
            <button
              onClick={closeMobile}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent collapsed={false} onNavigate={closeMobile} />
          </div>
        </div>
      )}
    </>
  );
}