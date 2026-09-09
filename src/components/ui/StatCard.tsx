import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cx } from '@/utils/format';
import { Skeleton } from './Skeleton';

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  hint,
  iconColor = 'bg-whatsapp-500/10 text-whatsapp-600 dark:text-whatsapp-400',
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: { value: number; label: string };
  hint?: string;
  iconColor?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <Skeleton className="mb-4 h-9 w-9 rounded-xl" />
        <Skeleton className="mb-2 h-3.5 w-20" />
        <Skeleton className="mb-2 h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  const positive = (change?.value ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-start justify-between">
        <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', iconColor)}>
          <Icon className="h-5 w-5" />
        </span>
        {change && (
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              positive
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? '+' : ''}
            {change.value}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">{hint}</p>}
    </div>
  );
}