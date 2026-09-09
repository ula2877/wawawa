import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/utils/format';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  busy?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-surface-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className={cx('animate-fade-in w-full rounded-t-2xl bg-white shadow-pop dark:bg-surface-900 sm:rounded-2xl', SIZES[size])}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-busy={busy || undefined}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <div>
              {title && <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>}
            </div>
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-surface-800"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-100 px-5 py-3.5 dark:border-surface-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
  loadingLabel = 'Loading...',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'success';
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      busy={loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-surface-600 dark:text-surface-300">{message}</p>
    </Modal>
  );
}