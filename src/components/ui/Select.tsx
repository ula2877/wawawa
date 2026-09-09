import React from 'react';
import { cx } from '@/utils/format';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cx(
            'h-9 w-full appearance-none rounded-lg border bg-white px-3 pr-9 text-sm text-surface-900 shadow-sm transition-colors',
            'dark:bg-surface-900 dark:text-surface-100',
            'focus:border-whatsapp-500 focus:outline-none focus:ring-2 focus:ring-whatsapp-500/20',
            error ? 'border-rose-400 dark:border-rose-500' : 'border-surface-300 dark:border-surface-700',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';