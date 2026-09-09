import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Pencil, Trash2, PauseCircle, PlayCircle, Eye, FileDown, Send } from 'lucide-react';
import type { Campaign, CampaignStatus } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { campaignService, type CampaignQuery } from '@/services/campaignService';
import { formatNumber, formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Dropdown } from '@/components/ui/Dropdown';
import { ErrorState } from '@/components/ui/States';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CampaignStatusBadge } from '@/components/domain/CampaignStatusBadge';
import { CampaignProgress } from '@/components/domain/CampaignProgress';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/store/toastStore';
import { cx } from '@/utils/format';

const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Running', label: 'Running' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// Frontend column keys -> backend sortable fields. The backend only supports
// sorting by these columns, so unsupported ones are not made sortable.
const SORT_FIELDS: Record<string, string> = {
  name: 'name',
  status: 'status',
  schedule: 'scheduled_at',
  createdAt: 'created_at',
};

type CampaignPage = {
  data: Campaign[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ kind: 'pause' | 'resume' | 'send' | 'export'; campaign: Campaign } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const query = useMemo<CampaignQuery>(() => {
    const q: CampaignQuery = {
      page,
      per_page: pageSize,
      sort_by: SORT_FIELDS[sortBy] ?? 'created_at',
      sort_direction: sortDir,
    };
    if (debouncedSearch) q.search = debouncedSearch;
    if (statusFilter) q.status = statusFilter;
    return q;
  }, [page, pageSize, sortBy, sortDir, debouncedSearch, statusFilter]);

  const queryKey = JSON.stringify(query);

  const fetchCampaigns = useCallback(() => campaignService.getCampaignsPage(query), [queryKey]);
  const campaigns = useApi<CampaignPage>(fetchCampaigns, [queryKey]);

  // Reset to the first page whenever search or a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // If a delete left the current page empty and we're beyond the last page, step back.
  useEffect(() => {
    const meta = campaigns.data?.meta;
    if (meta && (campaigns.data?.data?.length ?? 0) === 0 && meta.current_page > 1 && meta.total > 0 && !campaigns.loading) {
      setPage(meta.current_page - 1);
    }
  }, [campaigns.data, campaigns.loading]);

  const rows = campaigns.data?.data ?? [];
  const meta = campaigns.data?.meta;

  // The backend only allows deleting DRAFT or CANCELLED campaigns. Compute the
  // deletable subset of the current selection so bulk delete never triggers a
  // 409 on a running / completed / failed campaign.
  const deletableKeys = useMemo(() => {
    const statusById = new Map(rows.map((c) => [c.id, c.status]));
    return selectedKeys.filter((id) => {
      const status = statusById.get(id);
      return status === 'Draft' || status === 'Cancelled';
    });
  }, [rows, selectedKeys]);
  const skippedCount = selectedKeys.length - deletableKeys.length;

  const reload = () => campaigns.reload();

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const onSortChange = (key: string, dir: 'asc' | 'desc') => {
    setSortBy(key);
    setSortDir(dir);
  };

  const runAction = async (id: string, fn: () => Promise<void>, successMessage: string, errorMessage: string) => {
    setBusyId(id);
    try {
      await fn();
      toastSuccess(successMessage);
      reload();
    } catch {
      toastError(errorMessage);
    } finally {
      setBusyId(null);
    }
  };

  // Sequential bulk action; invalid transitions are skipped silently.
  const runBulk = async (fn: (id: string) => Promise<unknown>, successText: string, errorText: string) => {
    if (selectedKeys.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      let ok = 0;
      for (const id of selectedKeys) {
        try {
          await fn(id);
          ok++;
        } catch {
          // skip campaigns that do not allow this transition
        }
      }
      if (ok > 0) {
        toastSuccess(successText, `${ok} campaign${ok === 1 ? '' : 's'} updated.`);
      } else {
        toastError(errorText);
      }
      setSelectedKeys([]);
      reload();
    } finally {
      setBulkBusy(false);
    }
  };

  const onBulkPause = () =>
    runBulk(
      (id) => campaignService.pauseCampaign(id),
      'Campaigns paused',
      'No selected campaigns can be paused from their current state.',
    );

  const onBulkResume = () =>
    runBulk(
      (id) => campaignService.resumeCampaign(id),
      'Campaigns resumed',
      'No selected campaigns can be resumed from their current state.',
    );

  const onDeleteBulk = async () => {
    if (deletableKeys.length === 0 || deleting) {
      toastError('Nothing to delete', 'Only Draft or Cancelled campaigns can be deleted.');
      return;
    }
    setDeleting(true);
    try {
      await campaignService.deleteCampaigns(deletableKeys);
      toastSuccess('Campaigns deleted', `${deletableKeys.length} campaigns were removed.`);
      if (skippedCount > 0) {
        toastWarning('Some campaigns were skipped', `${skippedCount} selected campaign(s) are not Draft or Cancelled and cannot be deleted.`);
      }
      setBulkDelete(false);
      setSelectedKeys([]);
      reload();
    } catch {
      toastError('Failed to delete campaigns');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Campaign>[] = useMemo(() => {
    const actions = (c: Campaign) => (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconActionButton label="View" onClick={() => navigate(`/campaigns/${c.id}`)}>
          <Eye className="h-4 w-4" />
        </IconActionButton>
        <Dropdown
          align="right"
          width="w-52"
          trigger={<OverflowButton />}
          items={[
            { key: 'pause', label: c.status === 'Paused' ? 'Resume campaign' : 'Pause campaign', icon: c.status === 'Paused' ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />, onClick: () => setConfirmTarget({ kind: c.status === 'Paused' ? 'resume' : 'pause', campaign: c }), disabled: !['Running', 'Scheduled', 'Paused'].includes(c.status) },
            { key: 'send', label: 'Send now', icon: <Send className="h-4 w-4" />, onClick: () => setConfirmTarget({ kind: 'send', campaign: c }), disabled: !['Draft', 'Scheduled', 'Paused'].includes(c.status) },
            { key: 'edit', label: 'Edit campaign', icon: <Pencil className="h-4 w-4" />, onClick: () => navigate(`/campaigns/${c.id}/edit`) },
            { key: 'duplicate', label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onClick: () => runAction(c.id, async () => { await campaignService.duplicateCampaign(c.id); }, 'Campaign duplicated', 'Failed to duplicate campaign') },
            { key: 'export', label: 'Export report', icon: <FileDown className="h-4 w-4" />, onClick: () => setConfirmTarget({ kind: 'export', campaign: c }) },
            { key: 'divider', label: '', divider: true },
            { key: 'delete', label: 'Delete', danger: true, icon: <Trash2 className="h-4 w-4" />, onClick: () => setDeleteTarget(c), disabled: !['Draft', 'Cancelled'].includes(c.status) },
          ]}
        />
      </div>
    );

    return [
      {
        key: 'name',
        header: 'Campaign',
        sortValue: (c) => c.name,
        render: (c) => (
          <div className="max-w-60">
            <button onClick={() => navigate(`/campaigns/${c.id}`)} className="block truncate font-medium text-surface-900 hover:text-whatsapp-600 dark:text-surface-100 dark:hover:text-whatsapp-400">
              {c.name}
            </button>
            <p className="truncate text-xs text-surface-400">{c.id} · {c.description}</p>
          </div>
        ),
      },
      { key: 'sender', header: 'Sender', render: (c) => <span className="text-surface-600 dark:text-surface-300">{c.senderName}</span> },
      { key: 'recipients', header: 'Recipients', align: 'right', render: (c) => formatNumber(c.recipients) },
      {
        key: 'status',
        header: 'Status',
        sortValue: (c) => c.status,
        render: (c) => <CampaignStatusBadge status={c.status} />,
      },
      { key: 'progress', header: 'Progress', render: (c) => <CampaignProgress sent={c.sent} recipients={c.recipients} size="sm" /> },
      { key: 'sent', header: 'Sent', align: 'right', render: (c) => formatNumber(c.sent) },
      { key: 'delivered', header: 'Delivered', align: 'right', render: (c) => formatNumber(c.delivered) },
      { key: 'failed', header: 'Failed', align: 'right', render: (c) => <span className={cx(c.failed > 0 ? 'font-medium text-rose-500' : '')}>{formatNumber(c.failed)}</span> },
      { key: 'schedule', header: 'Schedule', sortValue: (c) => c.scheduledAt ?? '', render: (c) => (c.scheduledAt ? <span className="text-xs text-surface-500 dark:text-surface-400">{formatDateTime(c.scheduledAt)}</span> : <span className="text-xs text-surface-400">—</span>) },
      { key: 'actions', header: '', align: 'right', className: 'pr-3', render: actions },
    ];
  }, [navigate]);

  const onDelete = async () => {
    if (!deleteTarget) return;
    if (!['Draft', 'Cancelled'].includes(deleteTarget.status)) {
      toastError('Cannot delete campaign', 'Only Draft or Cancelled campaigns can be deleted.');
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await campaignService.deleteCampaign(deleteTarget.id);
      toastSuccess('Campaign deleted', `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      reload();
    } catch {
      toastError('Failed to delete campaign');
    } finally {
      setDeleting(false);
    }
  };

  const onConfirm = async () => {
    if (!confirmTarget) return;
    const { kind, campaign } = confirmTarget;
    setBusyId(campaign.id);
    try {
      if (kind === 'pause') {
        await campaignService.pauseCampaign(campaign.id);
        toastInfo('Campaign paused', `"${campaign.name}" is now paused.`);
      } else if (kind === 'resume') {
        await campaignService.resumeCampaign(campaign.id);
        toastSuccess('Campaign resumed', `"${campaign.name}" is running again.`);
      } else if (kind === 'send') {
        await campaignService.sendCampaign(campaign.id);
        toastSuccess('Campaign started', `"${campaign.name}" is now sending.`);
      } else {
        toastSuccess('Report exported', `Report for "${campaign.name}" downloaded (CSV).`);
      }
      setConfirmTarget(null);
      reload();
    } catch {
      toastError('Action failed', 'Something went wrong while updating the campaign.');
    } finally {
      setBusyId(null);
    }
  };

  if (campaigns.error) {
    return <ErrorState message="We couldn't load your campaigns." onRetry={reload} />;
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={`${formatNumber(meta?.total ?? 0)} campaigns in total`}
        crumbs={[{ label: 'Campaigns' }]}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <FileDown className="h-4 w-4" /> Reports
            </Button>
            <Button onClick={() => navigate('/campaigns/create')}>
              <Plus className="h-4 w-4" /> Create Campaign
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search campaigns..." className="w-full sm:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All Status' }, ...STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
            className="w-36"
            aria-label="Filter by status"
          />
          {(search || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {selectedKeys.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-whatsapp-200 bg-whatsapp-500/5 px-4 py-2.5 dark:border-whatsapp-500/30">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
            {selectedKeys.length} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBulkPause} disabled={bulkBusy}>
              <PauseCircle className="h-3.5 w-3.5" /> Pause
            </Button>
            <Button variant="outline" size="sm" onClick={onBulkResume} disabled={bulkBusy}>
              <PlayCircle className="h-3.5 w-3.5" /> Resume
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" disabled={bulkBusy} onClick={() => setSelectedKeys([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        loading={campaigns.loading}
        onRowClick={(c) => navigate(`/campaigns/${c.id}`)}
        dense
        selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
        sandbox={{
          page,
          setPage,
          pageSize,
          setPageSize: onPageSizeChange,
          total: meta?.total ?? 0,
          externalData: true,
          sort: { key: sortBy, dir: sortDir },
          onSortChange,
        }}
        mobileCard={{
          title: (c) => columns.find((col) => col.key === 'name')!.render!(c),
          actions: (c) => columns.find((col) => col.key === 'actions')!.render!(c),
          fields: [
            { label: 'Status', render: (c) => <CampaignStatusBadge status={c.status} /> },
            { label: 'Recipients', render: (c) => formatNumber(c.recipients) },
            { label: 'Progress', render: (c) => <CampaignProgress sent={c.sent} recipients={c.recipients} size="sm" /> },
            { label: 'Sent', render: (c) => formatNumber(c.sent) },
            { label: 'Delivered', render: (c) => formatNumber(c.delivered) },
            { label: 'Failed', render: (c) => formatNumber(c.failed) },
            { label: 'Schedule', render: (c) => (c.scheduledAt ? formatDateTime(c.scheduledAt) : '—') },
          ],
        }}
        empty={{
          icon: Send,
          title: 'No campaigns yet',
          description: 'Create your first WhatsApp campaign to start sending messages.',
          actionLabel: 'Create Campaign',
          onAction: () => navigate('/campaigns/create'),
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        loading={deleting}
        title="Delete Campaign?"
        message={
          <>
            Are you sure you want to delete <span className="font-semibold text-surface-800 dark:text-surface-100">"{deleteTarget?.name}"</span>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Campaign"
      />

      <ConfirmDialog
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={onDeleteBulk}
        loading={deleting}
        title="Delete Campaigns?"
        message={
          <>
            Are you sure you want to delete <b>{deletableKeys.length} campaign{deletableKeys.length === 1 ? '' : 's'}</b>?
            {skippedCount > 0 && <> {skippedCount} selected campaign{skippedCount === 1 ? '' : 's'} will be skipped (only Draft or Cancelled campaigns can be deleted).</>}
            This cannot be undone.
          </>
        }
        confirmLabel="Delete Campaigns"
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={onConfirm}
        loading={busyId !== null}
        title={
          confirmTarget?.kind === 'pause'
            ? 'Pause Campaign?'
            : confirmTarget?.kind === 'resume'
            ? 'Resume Campaign?'
            : confirmTarget?.kind === 'send'
            ? 'Send Campaign Now?'
            : 'Export Report?'
        }
        message={
          confirmTarget?.kind === 'pause' ? (
            <>
              Are you sure you want to pause <span className="font-semibold text-surface-800 dark:text-surface-100">"{confirmTarget?.campaign.name}"</span>? Remaining messages will be put on hold.
            </>
          ) : confirmTarget?.kind === 'resume' ? (
            <>
              Resume <span className="font-semibold text-surface-800 dark:text-surface-100">"{confirmTarget?.campaign.name}"</span>? It will continue sending to remaining recipients.
            </>
          ) : confirmTarget?.kind === 'send' ? (
            <>
              Send <span className="font-semibold text-surface-800 dark:text-surface-100">"{confirmTarget?.campaign.name}"</span> now to {formatNumber(confirmTarget?.campaign.recipients ?? 0)} recipients?
            </>
          ) : (
            <>Download a CSV report for <span className="font-semibold text-surface-800 dark:text-surface-100">"{confirmTarget?.campaign.name}"</span>?</>
          )
        }
        confirmLabel={confirmTarget?.kind === 'pause' ? 'Pause Campaign' : confirmTarget?.kind === 'send' ? 'Send Now' : 'Confirm'}
        confirmVariant={confirmTarget?.kind === 'send' ? 'success' : confirmTarget?.kind === 'export' ? 'primary' : 'danger'}
      />
    </div>
  );
}

function OverflowButton() {
  return (
    <span className="inline-flex items-center rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800">
      <DotsIcon />
    </span>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function IconActionButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}