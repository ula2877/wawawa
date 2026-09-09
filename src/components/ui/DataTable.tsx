import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { cx } from '@/utils/format';
import { Pagination } from './Pagination';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './States';
import type { LucideIcon } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
}

export interface MobileCardField<T> {
  label: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export interface MobileCardConfig<T> {
  title: (row: T) => React.ReactNode;
  subtitle?: (row: T) => React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  fields?: MobileCardField<T>[];
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  pageSizeOptions?: boolean;
  sandbox?: {
    page: number;
    setPage: (p: number) => void;
    pageSize: number;
    setPageSize: (s: number) => void;
    /** Total number of rows (server-side). When provided, pagination uses this instead of the current page length. */
    total?: number;
    /** When true, the data is already sorted/sliced by the server and the table should not re-sort or re-slice. */
    externalData?: boolean;
    sort?: { key: string | null; dir: 'asc' | 'desc' };
    onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  };
  selection?: {
    selectedKeys: string[];
    onSelectionChange: (keys: string[]) => void;
  };
  empty?: {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  showPagination?: boolean;
  dense?: boolean;
  mobileCard?: MobileCardConfig<T>;
}

function sortRows<T>(rows: T[], columns: Column<T>[], sortKey: string | null, dir: 'asc' | 'desc'): T[] {
  if (!sortKey) return rows;
  const col = columns.find((c) => c.key === sortKey);
  if (!col?.sortValue) return rows;
  const sorted = [...rows].sort((a, b) => {
    const va = col.sortValue!(a);
    const vb = col.sortValue!(b);
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    return String(va).localeCompare(String(vb));
  });
  return dir === 'asc' ? sorted : sorted.reverse();
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  onRowClick,
  pageSize: propPageSize = 10,
  sandbox,
  selection,
  empty,
  defaultSort,
  showPagination = true,
  dense,
  mobileCard,
}: DataTableProps<T>) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(propPageSize);
  const [localSortKey, setLocalSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>(defaultSort?.dir ?? 'asc');

  const page = sandbox?.page ?? localPage;
  const pageSize = sandbox?.pageSize ?? localPageSize;
  const setPage = sandbox ? sandbox.setPage : setLocalPage;
  const setPageSize = sandbox
    ? sandbox.setPageSize
    : (s: number) => {
        setLocalPageSize(s);
        setLocalPage(1);
      };

  // Server-driven tables (externalData) rely on the backend for ordering and slicing.
  const externalData = !!sandbox?.externalData;
  const sortKey = externalData ? (sandbox.sort?.key ?? null) : localSortKey;
  const sortDir = externalData ? (sandbox.sort?.dir ?? 'asc') : localSortDir;

  const sorted = useMemo(() => sortRows(data, columns, sortKey, sortDir), [data, columns, sortKey, sortDir]);
  const totalCount = externalData ? (sandbox?.total ?? data.length) : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = externalData
    ? data
    : showPagination
      ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
      : sorted;

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    if (externalData && sandbox?.onSortChange) {
      const nextDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
      sandbox.onSortChange(col.key, nextDir);
      return;
    }
    if (localSortKey === col.key) {
      setLocalSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setLocalSortKey(col.key);
      setLocalSortDir('asc');
    }
  };

  const toggleRow = (key: string) => {
    if (!selection) return;
    const current = selection.selectedKeys.includes(key);
    const next = current ? selection.selectedKeys.filter((k) => k !== key) : [...selection.selectedKeys, key];
    selection.onSelectionChange(next);
  };

  const toggleAll = () => {
    if (!selection) return;
    const pageKeys = paged.map(rowKey);
    const allSelected = pageKeys.every((k) => selection.selectedKeys.includes(k));
    selection.onSelectionChange(
      allSelected ? selection.selectedKeys.filter((k) => !pageKeys.includes(k)) : [...new Set([...selection.selectedKeys, ...pageKeys])],
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <TableSkeleton rows={7} cols={columns.length} />
      </div>
    );
  }

  if (data.length === 0 && empty) {
    return (
      <div className="rounded-xl border border-dashed border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} actionLabel={empty.actionLabel} onAction={empty.onAction} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-200 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
      {mobileCard && (
        <div className="divide-y divide-surface-100 dark:divide-surface-800 sm:hidden">
          {paged.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-surface-400">No results found</div>
          ) : (
            paged.map((row) => {
              const key = rowKey(row);
              const selected = selection?.selectedKeys.includes(key) ?? false;
              return (
                <MobileCardRow
                  key={key}
                  row={row}
                  config={mobileCard}
                  selected={selected}
                  onToggle={selection ? () => toggleRow(key) : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                />
              );
            })
          )}
        </div>
      )}
      <div className={cx('overflow-x-auto scrollbar-thin', mobileCard && 'hidden sm:block')}>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-surface-100 dark:border-surface-800">
              {selection && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-surface-300 accent-whatsapp-500"
                    checked={paged.length > 0 && paged.every((r) => selection.selectedKeys.includes(rowKey(r)))}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cx(
                      'px-4 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400',
                      dense ? 'py-2.5' : 'py-3',
                      col.sortValue ? 'cursor-pointer select-none hover:text-surface-800 dark:hover:text-surface-200' : '',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.headerClassName,
                    )}
                    onClick={() => col.sortValue && toggleSort(col)}
                  >
                    <span className={cx('inline-flex items-center gap-1.5', col.align === 'right' && 'flex-row-reverse')}>
                      {col.header}
                      {col.sortValue &&
                        (isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-whatsapp-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-whatsapp-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-surface-400">
                    <ChevronDown className="h-5 w-5 opacity-50" />
                    <span className="text-sm">No results found</span>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const key = rowKey(row);
                const selected = selection?.selectedKeys.includes(key) ?? false;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cx(
                      'border-b border-surface-50 transition-colors last:border-0 dark:border-surface-800/60',
                      onRowClick && 'cursor-pointer',
                      'hover:bg-surface-50 dark:hover:bg-surface-800/40',
                      selected && 'bg-whatsapp-500/5',
                    )}
                  >
                    {selection && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-surface-300 accent-whatsapp-500"
                          checked={selected}
                          onChange={() => toggleRow(key)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${key}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cx(
                          'px-4 text-surface-700 dark:text-surface-200',
                          dense ? 'py-2.5' : 'py-3',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className,
                        )}
                      >
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {showPagination && <Pagination page={safePage} pageSize={pageSize} total={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    </div>
  );
}

function MobileCardRow<T>({
  row,
  config,
  selected,
  onToggle,
  onClick,
}: {
  row: T;
  config: MobileCardConfig<T>;
  selected: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      className={cx('px-4 py-3 transition-colors', selected && 'bg-whatsapp-500/5', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-semibold text-surface-900 dark:text-surface-100">{config.title(row)}</div>
          {config.subtitle && (
            <div className="mt-0.5 break-words text-xs text-surface-500 dark:text-surface-400">{config.subtitle(row)}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggle && (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-surface-300 accent-whatsapp-500"
              checked={selected}
              onChange={onToggle}
              aria-label="Select row"
            />
          )}
          {config.actions && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              {config.actions(row)}
            </div>
          )}
        </div>
      </div>
      {config.fields && config.fields.length > 0 && (
        <dl className="mt-2.5 space-y-1.5">
          {config.fields.map((f, i) => (
            <div key={i} className={cx('flex items-start justify-between gap-3 text-sm', f.className)}>
              <dt className="shrink-0 text-surface-400">{f.label}</dt>
              <dd className="min-w-0 flex-1 break-words text-right font-medium text-surface-700 dark:text-surface-200">
                {f.render(row)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}