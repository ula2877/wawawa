import React from 'react';
import { cx } from '@/utils/format';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cx('flex flex-wrap gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cx(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-surface-100'
                : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200',
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  isActive
                    ? 'bg-whatsapp-500/10 text-whatsapp-700 dark:text-whatsapp-400'
                    : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-300',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}