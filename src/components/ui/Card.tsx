import React from 'react';
import { cx } from '@/utils/format';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  bodyClassName?: string;
  padded?: boolean;
  headerClassName?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, subtitle, actions, bodyClassName, padded = true, headerClassName, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        'rounded-xl border border-surface-200 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900',
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className={cx('flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 px-5 py-4 dark:border-surface-800', headerClassName)}>
          <div>
            {title && <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cx(padded && 'p-5', bodyClassName)}>{children}</div>
    </div>
  ),
);

Card.displayName = 'Card';