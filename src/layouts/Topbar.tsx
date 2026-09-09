import { useCallback, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Search,
  Send,
  Users,
  FileText,
  FileClock,
  LogOut,
  UserCircle,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react';
import { cx, timeAgo } from '@/utils/format';
import { useSidebarStore } from '@/store/sidebarStore';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import type { AppNotification } from '@/types';
import { apiFetch } from '@/services/api';
import { campaignService } from '@/services/campaignService';
import { contactService } from '@/services/contactService';
import { templateService } from '@/services/templateService';
import { notificationService } from '@/services/notificationService';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import * as NotificationIcons from 'lucide-react';

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  campaigns: 'Campaigns',
  contacts: 'Contacts',
  'contact-groups': 'Contact Groups',
  templates: 'Templates',
  'whatsapp-accounts': 'WhatsApp Accounts',
  'message-queue': 'Message Queue',
  'message-logs': 'Message Logs',
  analytics: 'Analytics',
  reports: 'Reports',
  team: 'Team',
  'activity-logs': 'Activity Logs',
  settings: 'Settings',
  profile: 'My Profile',
};

function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    campaigns: { id: string; name: string }[];
    contacts: { id: string; name: string }[];
    templates: { id: number; name: string }[];
    logs: { id: string; recipient: string }[];
  }>({ campaigns: [], contacts: [], templates: [], logs: [] });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ campaigns: [], contacts: [], templates: [], logs: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const t = setTimeout(async () => {
      try {
        const [campaigns, contacts, templates, logRes] = await Promise.all([
          campaignService.getCampaignsPage({ search: q, per_page: 4 }),
          contactService.getContactsPage({ search: q, per_page: 4 }),
          templateService.getTemplatesPage({ search: q, per_page: 4 }),
          apiFetch<{ data: { id: string; recipient: string; contact_name: string | null }[] }>(
            `/messages?${new URLSearchParams({ search: q, per_page: '3' }).toString()}`,
          ),
        ]);
        if (cancelled) return;
        setResults({
          campaigns: campaigns.data.map((c) => ({ id: c.id, name: c.name })),
          contacts: contacts.data.map((c) => ({ id: c.id, name: c.name })),
          templates: templates.data.map((t) => ({ id: t.id, name: t.name })),
          logs: logRes.data.map((m) => ({ id: m.id, recipient: m.contact_name || m.recipient })),
        });
      } catch {
        if (!cancelled) setResults({ campaigns: [], contacts: [], templates: [], logs: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const total = Object.values(results).reduce((a, b) => a + b.length, 0);

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative hidden w-full max-w-sm md:block" ref={ref}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder="Search campaigns, contacts, templates..."
        className="h-9 w-full rounded-lg border border-surface-200 bg-surface-50 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:border-whatsapp-500 focus:outline-none focus:ring-2 focus:ring-whatsapp-500/20 dark:border-surface-800 dark:bg-surface-800 dark:text-surface-100"
        aria-label="Search"
      />
      {open && query.trim().length >= 2 && (
        <div className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-surface-200 bg-white py-2 shadow-pop dark:border-surface-700 dark:bg-surface-900">
          {loading ? (
            <p className="px-4 py-3 text-sm text-surface-400">Searching...</p>
          ) : total === 0 ? (
            <p className="px-4 py-3 text-sm text-surface-400">No results for "{query.trim()}"</p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {results.campaigns.length > 0 && (
                <SearchGroup label="Campaigns" icon={<Send className="h-3.5 w-3.5" />}>
                  {results.campaigns.map((c) => (
                    <SearchRow key={c.id} onClick={() => go(`/campaigns/${c.id}`)} title={c.name} subtitle={String(c.id)} />
                  ))}
                </SearchGroup>
              )}
              {results.templates.length > 0 && (
                <SearchGroup label="Templates" icon={<FileText className="h-3.5 w-3.5" />}>
                  {results.templates.map((t) => (
                    <SearchRow key={t.id} onClick={() => go(`/templates/${t.id}`)} title={t.name} subtitle={String(t.id)} />
                  ))}
                </SearchGroup>
              )}
              {results.contacts.length > 0 && (
                <SearchGroup label="Contacts" icon={<Users className="h-3.5 w-3.5" />}>
                  {results.contacts.map((c) => (
                    <SearchRow key={c.id} onClick={() => go('/contacts')} title={c.name} subtitle={c.id} />
                  ))}
                </SearchGroup>
              )}
              {results.logs.length > 0 && (
                <SearchGroup label="Message Logs" icon={<FileClock className="h-3.5 w-3.5" />}>
                  {results.logs.map((l) => (
                    <SearchRow key={l.id} onClick={() => go('/message-logs')} title={l.recipient} subtitle={l.id} />
                  ))}
                </SearchGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="flex items-center gap-1.5 px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}

function SearchRow({ onClick, title, subtitle }: { onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 px-4 py-1.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
    >
      <span className="truncate text-sm text-surface-700 dark:text-surface-200">{title}</span>
      <span className="shrink-0 text-[10px] text-surface-400">{subtitle}</span>
    </button>
  );
}

const READ_KEY = 'wablast:notifications:read';

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota errors
  }
}

function NotificationButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const ref = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.get();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const unread = items.filter((n) => !n.read && !readIds.has(n.id)).length;

  const markAll = () => {
    const next = new Set(readIds);
    items.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveReadIds(next);
  };

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  const openNotification = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const iconMap: Record<string, React.ReactNode> = {
    Success: <NotificationIcons.CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    Error: <NotificationIcons.XCircle className="h-4 w-4 text-rose-500" />,
    Warning: <NotificationIcons.AlertTriangle className="h-4 w-4 text-amber-500" />,
    Info: <NotificationIcons.Info className="h-4 w-4 text-sky-500" />,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-pop dark:border-surface-700 dark:bg-surface-900">
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-2.5 dark:border-surface-800">
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-surface-400">Loading notifications...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-surface-400">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={cx(
                    'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800',
                    !n.read && !readIds.has(n.id) && 'bg-whatsapp-500/5',
                  )}
                >
                  <span className="mt-0.5 shrink-0">{iconMap[n.type]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-surface-800 dark:text-surface-100">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-surface-500 dark:text-surface-400">{n.message}</span>
                    <span className="mt-1 block text-[10px] text-surface-400">{timeAgo(n.time)}</span>
                  </span>
                  {!n.read && !readIds.has(n.id) && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-whatsapp-500" />}
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate('/activity-logs');
            }}
            className="block w-full border-t border-surface-100 px-4 py-2.5 text-center text-xs font-medium text-whatsapp-600 hover:bg-surface-50 dark:border-surface-800 dark:text-whatsapp-400 dark:hover:bg-surface-800"
          >
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const { resolved, setMode } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const segment = location.pathname.split('/')[1] || 'dashboard';
  const title = TITLES[segment] ?? 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-200 bg-white/90 px-4 backdrop-blur dark:border-surface-800 dark:bg-surface-900/90 sm:px-6">
      <button
        onClick={() => setMobileOpen(true)}
        className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <p className="hidden text-[11px] text-surface-400 sm:block">
          <Link to="/dashboard" className="hover:text-surface-600 dark:hover:text-surface-300">
            Home
          </Link>
          <span className="mx-1">/</span>
          <span className="font-medium" aria-current="page">
            {title}
          </span>
        </p>
        <h2 className="truncate text-base font-bold text-surface-900 dark:text-surface-100">{title}</h2>
      </div>

      <div className="flex-1" />

      <GlobalSearch />

      <div className="flex items-center gap-1">
        <button
          onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
          aria-label="Toggle theme"
        >
          {resolved === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <NotificationButton />
      </div>

      <Dropdown
        width="w-56"
        trigger={
          <div className="ml-1 flex cursor-pointer items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
            <Avatar name={user?.name ?? 'User'} color={user?.avatarColor} size="sm" />
            <span className="hidden max-w-28 truncate text-sm font-medium text-surface-700 dark:text-surface-200 sm:block lg:max-w-32">
              {user?.name ?? 'User'}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-surface-400 sm:block" />
          </div>
        }
        items={[
          { key: 'profile', label: 'My Profile', icon: <UserCircle className="h-4 w-4" />, onClick: () => navigate('/profile') },
          { key: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4" />, onClick: () => navigate('/settings') },
          { key: 'logout', label: 'Sign Out', icon: <LogOut className="h-4 w-4" />, onClick: handleLogout, danger: true },
        ]}
      />
    </header>
  );
}