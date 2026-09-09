import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import type { NotificationType } from '@/types';
import { cx } from '@/utils/format';

const ICONS: Record<NotificationType, React.ReactNode> = {
  Success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  Error: <XCircle className="h-5 w-5 text-rose-500" />,
  Warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  Info: <Info className="h-5 w-5 text-sky-500" />,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2.5" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-pop dark:bg-surface-900',
            t.type === 'Success' && 'border-emerald-200 dark:border-emerald-500/30',
            t.type === 'Error' && 'border-rose-200 dark:border-rose-500/30',
            t.type === 'Warning' && 'border-amber-200 dark:border-amber-500/30',
            t.type === 'Info' && 'border-sky-200 dark:border-sky-500/30',
          )}
          role="status"
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{t.title}</p>
            {t.message && <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{t.message}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-0.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}