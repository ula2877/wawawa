import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  actionVariant = 'primary',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className ?? ''}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-surface-500 dark:text-surface-400">{description}</p>
      {actionLabel && onAction && (
        <Button variant={actionVariant} size="md" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = "We couldn't load your data.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
        <AlertTriangleIcon />
      </div>
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-surface-500 dark:text-surface-400">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function StateContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-surface-200 dark:border-surface-800">
      {children}
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}