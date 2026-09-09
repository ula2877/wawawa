import { Check, Loader2 } from 'lucide-react';
import { cx } from '@/utils/format';

export interface WizardStep {
  key: string;
  label: string;
}

export function StepIndicator({ steps, current, onStep }: { steps: WizardStep[]; current: number; onStep?: (index: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-0">
      {steps.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <li key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={() => onStep?.(i)}
              disabled={i > current}
              className={cx(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                onStep && i <= current && 'cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800',
                !onStep && 'pointer-events-none',
              )}
            >
              <span
                className={cx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isDone && 'bg-whatsapp-500 text-white',
                  isActive && 'bg-surface-900 text-white dark:bg-whatsapp-500',
                  !isDone && !isActive && 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cx(
                  'hidden font-medium sm:inline',
                  isActive ? 'text-surface-900 dark:text-surface-100' : isDone ? 'text-surface-600 dark:text-surface-300' : 'text-surface-400 dark:text-surface-500',
                )}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className="mx-1 hidden h-px w-6 bg-surface-200 sm:block dark:bg-surface-700" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function WizardFooter({
  step,
  total,
  onBack,
  onNext,
  nextLabel,
  nextLoading,
  loadingLabel,
  cancelLabel,
  onCancel,
  nextDisabled,
}: {
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextLoading?: boolean;
  loadingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  nextDisabled?: boolean;
}) {
  const isLast = step === total - 1;
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 pt-5 dark:border-surface-800">
      <div className="flex items-center gap-2">
        {cancelLabel && (
          <button onClick={onCancel} type="button" className="text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
            {cancelLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={onBack}
            disabled={nextLoading}
            className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-100 disabled:opacity-60 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
          >
            Back
          </button>
        )}
        {!isLast && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || nextLoading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-surface-900 px-4 text-sm font-medium text-white transition-colors hover:bg-surface-800 disabled:opacity-50 dark:bg-whatsapp-500 dark:hover:bg-whatsapp-600 dark:disabled:opacity-50"
          >
            {nextLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {nextLoading ? (loadingLabel ?? 'Saving...') : (nextLabel ?? 'Next')}
          </button>
        )}
      </div>
    </div>
  );
}

export function StepError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{message}</p>;
}