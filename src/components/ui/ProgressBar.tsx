import { cx } from '@/utils/format';

const TONES: Record<string, string> = {
  green: 'bg-whatsapp-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  gray: 'bg-surface-400',
};

export function ProgressBar({
  value,
  max = 100,
  tone = 'green',
  size = 'md',
  className,
  showLabel,
  label,
}: {
  value: number;
  max?: number;
  tone?: keyof typeof TONES | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  label?: string;
}) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  return (
    <div className={cx('w-full', className)}>
      {(showLabel || label) && (
        <div className="mb-1 flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
          <span>{label ?? `${pct}%`}</span>
          {showLabel && <span className="font-semibold text-surface-700 dark:text-surface-200">{pct}%</span>}
        </div>
      )}
      <div className={cx('w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800', heights[size])}>
        <div
          className={cx('h-full rounded-full transition-all duration-500', TONES[tone] ?? 'bg-whatsapp-500')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}