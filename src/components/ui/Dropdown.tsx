import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/utils/format';

export interface DropdownItem {
  key: string;
  label: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: string;
  closeOnClick?: boolean;
}

const MENU_GAP = 8;

export function Dropdown({ trigger, items, align = 'right', width = 'w-48', closeOnClick = true }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const positionMenu = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    const menuW = menu.offsetWidth;
    const menuH = menu.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuH + MENU_GAP && spaceAbove > spaceBelow;

    let top = openUp ? rect.top - menuH - MENU_GAP : rect.bottom + MENU_GAP;
    if (top + menuH > vh - MENU_GAP) top = vh - menuH - MENU_GAP;
    if (top < MENU_GAP) top = MENU_GAP;

    let left = align === 'right' ? rect.right - menuW : rect.left;
    if (left + menuW > vw - MENU_GAP) left = vw - menuW - MENU_GAP;
    if (left < MENU_GAP) left = MENU_GAP;

    setPos({ left, top });
  }, [align]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    positionMenu();
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    const onViewportChange = () => positionMenu();
    document.addEventListener('scroll', onViewportChange, true);
    document.addEventListener('resize', onViewportChange);
    return () => {
      document.removeEventListener('scroll', onViewportChange, true);
      document.removeEventListener('resize', onViewportChange);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const menu = (
    <div
      ref={menuRef}
      className={cx(
        'animate-fade-in z-40 rounded-xl border border-surface-200 bg-white py-1 shadow-pop dark:border-surface-700 dark:bg-surface-900',
        width,
      )}
      style={
        pos
          ? { position: 'fixed', left: pos.left, top: pos.top }
          : { position: 'fixed', left: -9999, top: -9999, visibility: 'hidden' }
      }
      role="menu"
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 border-t border-surface-100 dark:border-surface-800" />
        ) : (
          <button
            key={item.key ?? i}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (closeOnClick) setOpen(false);
              item.onClick?.();
            }}
            className={cx(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
              item.danger
                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100',
              item.disabled && 'pointer-events-none opacity-50',
            )}
          >
            {item.icon}
            <span className="min-w-0">{item.label}</span>
          </button>
        ),
      )}
    </div>
  );

  return (
    <div className="relative inline-block" ref={anchorRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center" aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </button>
      {open && createPortal(menu, document.body)}
    </div>
  );
}

export function SelectButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg border border-surface-300 px-2.5 py-1.5 text-sm text-surface-600 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800',
        className,
      )}
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5" />
    </span>
  );
}