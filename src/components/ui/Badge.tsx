import React from 'react';
import { cx } from '@/utils/format';
import { STATUS_COLORS, STATUS_DOTS } from '@/utils/constants';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, status, dot, children, ...props }, ref) => {
    const color = status
      ? STATUS_COLORS[status]
      : 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700';
    const dotColor = status ? STATUS_DOTS[status] ?? 'bg-whatsapp-500' : 'bg-whatsapp-500';
    return (
      <span
        ref={ref}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
          color,
          className,
        )}
        {...props}
      >
        {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dotColor)} />}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';