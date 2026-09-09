import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/utils/format';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && total <= pageSize) {
    return (
      <div className="flex items-center justify-between px-1 py-3 text-xs text-surface-500 dark:text-surface-400">
        <span>
          Showing {total} of {total} entries
        </span>
      </div>
    );
  }

  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
        <span>
          Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded-md border border-surface-200 bg-white px-1.5 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
            aria-label="Rows per page"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-surface-200 p-1.5 text-surface-500 transition-colors hover:bg-surface-50 disabled:pointer-events-none disabled:opacity-50 dark:border-surface-700 dark:hover:bg-surface-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="px-1 text-xs text-surface-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cx(
                'h-8 min-w-8 rounded-lg px-2 text-sm transition-colors',
                p === page
                  ? 'bg-surface-900 font-semibold text-white dark:bg-whatsapp-500'
                  : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-surface-200 p-1.5 text-surface-500 transition-colors hover:bg-surface-50 disabled:pointer-events-none disabled:opacity-50 dark:border-surface-700 dark:hover:bg-surface-800"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}