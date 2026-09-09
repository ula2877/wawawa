import { Loader2 } from 'lucide-react';
import { cx } from '@/utils/format';

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cx('flex items-center justify-center gap-2.5 py-10 text-sm text-surface-500 dark:text-surface-400', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-whatsapp-500" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-whatsapp-500/10">
        <Loader2 className="h-5 w-5 animate-spin text-whatsapp-500" />
      </div>
      <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
    </div>
  );
}