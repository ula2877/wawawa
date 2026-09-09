import React, { useState } from 'react';
import { cx } from '@/utils/format';

export function Tooltip({ content, children, side = 'top' }: { content: string; children: React.ReactNode; side?: 'top' | 'bottom' }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cx(
            'absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-900 px-2.5 py-1 text-xs font-medium text-white shadow-pop dark:bg-surface-100 dark:text-surface-900',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}