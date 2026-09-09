import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Eye, FileText, MoreHorizontal,
} from 'lucide-react';
import type { Template } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { templateService, type TemplateQuery } from '@/services/templateService';
import { formatDateTime, formatNumber } from '@/utils/format';
import { replaceVariables } from '@/utils/template';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/States';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/Modal';
import { WhatsAppPreview } from '@/components/domain/WhatsAppPreview';
import { toastSuccess, toastError } from '@/store/toastStore';

const SORT_FIELDS: Record<string, string> = {
  name: 'name',
  code: 'code',
  category: 'category',
  language: 'language',
  usage: 'usage_count',
  updated: 'updated_at',
};

function languageLabel(lang: string): string {
  const map: Record<string, string> = { id: 'Indonesian', en: 'English' };
  return map[lang] ?? lang?.toUpperCase() ?? '—';
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = useApi(() => templateService.getMeta(), []);

  const query = useMemo<TemplateQuery>(() => {
    const q: TemplateQuery = {
      page,
      per_page: pageSize,
      sort_by: SORT_FIELDS[sortBy] ?? 'updated_at',
      sort_direction: sortDir,
    };
    if (debouncedSearch) q.search = debouncedSearch;
    if (categoryFilter) q.category = categoryFilter;
    return q;
  }, [page, pageSize, sortBy, sortDir, debouncedSearch, categoryFilter]);

  const queryKey = JSON.stringify(query);
  const fetchTemplates = useCallback(() => templateService.getTemplatesPage(query), [queryKey]);
  const templates = useApi<{ data: Template[]; meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null } }>(
    fetchTemplates,
    [queryKey],
  );

  const categories = (meta.data?.categories ?? []).map((c) => ({ value: c, label: c }));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const onSortChange = (key: string, dir: 'asc' | 'desc') => {
    setSortBy(key);
    setSortDir(dir);
  };

  const onDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await templateService.deleteTemplate(deleteTarget.id);
      toastSuccess('Template deleted', `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      templates.reload();
    } catch {
      toastError('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const onDeleteBulk = async () => {
    if (selectedKeys.length === 0 || deleting) return;
    setDeleting(true);
    try {
      for (const id of selectedKeys) {
        await templateService.deleteTemplate(Number(id));
      }
      toastSuccess('Templates deleted', `${selectedKeys.length} templates were removed.`);
      setBulkDelete(false);
      setSelectedKeys([]);
      templates.reload();
    } catch {
      toastError('Failed to delete templates');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Template>[] = useMemo(() => {
    const actions = (t: Template) => (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          align="right"
          width="w-52"
          trigger={
            <span className="inline-flex rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          }
          items={[
            { key: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" />, onClick: () => setPreview(t) },
            { key: 'edit', label: 'Edit template', icon: <Pencil className="h-4 w-4" />, onClick: () => navigate(`/templates/${t.id}/edit`) },
            {
              key: 'delete',
              label: 'Delete',
              danger: true,
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => setDeleteTarget(t),
            },
          ]}
        />
      </div>
    );

    return [
      {
        key: 'name',
        header: 'Template',
        sortValue: (t) => t.name,
        render: (t) => (
          <div className="max-w-56">
            <button
              onClick={() => setPreview(t)}
              className="block truncate font-medium text-surface-900 hover:text-whatsapp-600 dark:text-surface-100 dark:hover:text-whatsapp-400"
            >
              {t.name}
            </button>
            <p className="truncate font-mono text-xs text-surface-400">{t.code}</p>
          </div>
        ),
      },
      { key: 'category', header: 'Category', sortValue: (t) => t.category, render: (t) => <Badge status="blue" className="normal-case">{t.category}</Badge> },
      { key: 'language', header: 'Language', sortValue: (t) => t.language, render: (t) => <span className="text-sm text-surface-600 dark:text-surface-300">{languageLabel(t.language)}</span> },
      { key: 'usage', header: 'Usage', align: 'right', sortValue: (t) => t.usage_count, render: (t) => <span className="text-surface-600 dark:text-surface-300">{formatNumber(t.usage_count)}</span> },
      { key: 'updated', header: 'Updated', sortValue: (t) => t.updated_at, render: (t) => <span className="text-xs text-surface-500">{formatDateTime(t.updated_at)}</span> },
      { key: 'actions', header: '', align: 'right', render: actions },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (templates.error) {
    return <ErrorState message="We couldn't load your templates." onRetry={templates.reload} />;
  }

  const total = templates.data?.meta.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Message Templates"
        subtitle={`${formatNumber(total)} templates in total`}
        crumbs={[{ label: 'Templates' }]}
        actions={
          <Button onClick={() => navigate('/templates/create')}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." className="w-full md:w-auto md:flex-1 md:max-w-md" />
        <div className="flex w-full gap-3 md:w-auto">
          <div className="flex-1 md:w-52 md:flex-none">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[{ value: '', label: 'All Categories' }, ...categories]}
              aria-label="Filter by category"
            />
          </div>
        </div>
        {(search || categoryFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryFilter(''); }}>
            Clear
          </Button>
        )}
      </div>

      {selectedKeys.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-whatsapp-200 bg-whatsapp-500/5 px-4 py-2.5 dark:border-whatsapp-500/30">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
            {selectedKeys.length} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="danger" size="sm" onClick={() => setBulkDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={templates.data?.data ?? []}
        rowKey={(t) => String(t.id)}
        selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
        loading={templates.loading}
        sandbox={{
          page,
          setPage,
          pageSize,
          setPageSize: onPageSizeChange,
          total,
          externalData: true,
          sort: { key: sortBy, dir: sortDir },
          onSortChange,
        }}
        mobileCard={{
          title: (t) => columns.find((col) => col.key === 'name')!.render!(t),
          actions: (t) => columns.find((col) => col.key === 'actions')!.render!(t),
          fields: [
            { label: 'Category', render: (t) => t.category },
            { label: 'Language', render: (t) => languageLabel(t.language) },
            { label: 'Usage', render: (t) => formatNumber(t.usage_count) },
            { label: 'Updated', render: (t) => formatDateTime(t.updated_at) },
          ],
        }}
        empty={{
          icon: FileText,
          title: 'No templates yet',
          description: 'Create your first message template to use in campaigns.',
          actionLabel: 'New Template',
          onAction: () => navigate('/templates/create'),
        }}
      />

      <Drawer open={!!preview} onClose={() => setPreview(null)} title="Template preview" side="left">
        {preview && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-surface-900 dark:text-surface-100">{preview.name}</p>
                <p className="text-xs text-surface-400">{preview.code} · {preview.category}</p>
              </div>
            </div>
            <WhatsAppPreview
              senderName="Marketing 01"
              recipientName="Budi"
              message={replaceVariables(preview.content)}
              timestamp="10:32"
            />
            {preview.variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preview.variables.map((v) => (
                  <span key={v} className="rounded-md border border-whatsapp-200 bg-whatsapp-500/5 px-2 py-0.5 font-mono text-xs text-whatsapp-700 dark:border-whatsapp-500/30 dark:text-whatsapp-400">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/templates/${preview.id}/edit`)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete Template?"
        message={<>Are you sure you want to delete <b>{deleteTarget?.name}</b>? This cannot be undone.</>}
        confirmLabel="Delete Template"
        loading={deleting}
        loadingLabel="Deleting..."
      />

      <ConfirmDialog
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={onDeleteBulk}
        title="Delete Templates?"
        message={<>Are you sure you want to delete <b>{selectedKeys.length} templates</b>? This cannot be undone.</>}
        confirmLabel="Delete Templates"
        loading={deleting}
        loadingLabel="Deleting..."
      />
    </div>
  );
}
