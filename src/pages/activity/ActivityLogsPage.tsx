import { useCallback, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import type { ActivityLog, ActivityModule } from '@/types';
import { useApi } from '@/hooks/useApi';
import { activityService } from '@/services/teamService';
import { formatTime, formatDate, avatarColor } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/States';

const MODULES: { value: ActivityModule; label: string }[] = [
  { value: 'Campaign', label: 'Campaign' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Template', label: 'Template' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Team', label: 'Team' },
  { value: 'Settings', label: 'Settings' },
  { value: 'Auth', label: 'Auth' },
];

export default function ActivityLogsPage() {
  const [moduleFilter, setModuleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLogs = useCallback(() => activityService.getLogs(), []);
  const logs = useApi<ActivityLog[]>(fetchLogs, []);

  const filtered = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return (logs.data ?? []).filter((l) => {
      const matchesModule = !moduleFilter || l.module === moduleFilter;
      const matchesUser = !q || l.user.toLowerCase().includes(q);
      const t = new Date(l.date).getTime();
      const matchesFrom = !fromDate || t >= new Date(`${fromDate}T00:00:00`).getTime();
      const matchesTo = !toDate || t <= new Date(`${toDate}T23:59:59`).getTime();
      return matchesModule && matchesUser && matchesFrom && matchesTo;
    });
  }, [logs.data, moduleFilter, userSearch, fromDate, toDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    filtered.forEach((l) => {
      const day = new Date(l.date).toDateString();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    });
    return [...map.entries()].sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filtered]);

  if (logs.error) {
    return <ErrorState message="We couldn't load the activity logs." onRetry={logs.reload} />;
  }

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        subtitle={`${filtered.length} events tracked across the app`}
        crumbs={[{ label: 'Activity Logs' }]}
        actions={
          <Button variant="outline" onClick={logs.reload}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 rounded-xl border border-surface-200 bg-white p-4 sm:grid-cols-2 dark:border-surface-800 dark:bg-surface-900 lg:grid-cols-5">
        <Select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="lg:col-span-1"
          options={[{ value: '', label: 'All Modules' }, ...MODULES.map((m) => ({ value: m.value, label: m.label }))]}
          aria-label="Filter by module"
        />
        <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search by user..." className="lg:col-span-2" />
        <div className="grid grid-cols-2 gap-2 lg:col-span-2 lg:flex lg:items-center lg:gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-surface-300 bg-white px-3 text-sm text-surface-900 shadow-sm focus:border-whatsapp-500 focus:outline-none focus:ring-2 focus:ring-whatsapp-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-surface-300 bg-white px-3 text-sm text-surface-900 shadow-sm focus:border-whatsapp-500 focus:outline-none focus:ring-2 focus:ring-whatsapp-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
            aria-label="To date"
          />
        </div>
        {(moduleFilter || userSearch || fromDate || toDate) && (
          <Button variant="ghost" size="sm" className="lg:col-span-5 lg:justify-self-end" onClick={() => { setModuleFilter(''); setUserSearch(''); setFromDate(''); setToDate(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      {logs.loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
              <Activity className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">No activity found</h3>
            <p className="mt-1.5 max-w-sm text-sm text-surface-500 dark:text-surface-400">
              Try adjusting your filters to see more events.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-400">
                {formatDate(day)} · {items.length} event{items.length !== 1 ? 's' : ''}
              </h3>
              <div className="overflow-hidden rounded-xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
                <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                  {items.map((l) => (
                    <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                      <Avatar name={l.user} color={avatarColor(l.user)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-surface-800 dark:text-surface-100">
                          <span className="font-medium">{l.user}</span>{' '}
                          <span className="text-surface-600 dark:text-surface-300">{l.action}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-surface-400">
                          {l.id} · {formatTime(l.date)}
                        </p>
                      </div>
                      <Badge className="capitalize">{l.module}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
