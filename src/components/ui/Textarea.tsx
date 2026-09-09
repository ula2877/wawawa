import React from 'react';
import { cx } from '@/utils/format';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cx(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-surface-900 shadow-sm transition-colors',
            'placeholder:text-surface-400 dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500',
            'focus:border-whatsapp-500 focus:outline-none focus:ring-2 focus:ring-whatsapp-500/20',
            error ? 'border-rose-400 dark:border-rose-500' : 'border-surface-300 dark:border-surface-700',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';