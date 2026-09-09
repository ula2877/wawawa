import { useCallback, useMemo, useState } from 'react';
import { Clock, ListOrdered, Ban, RotateCcw, MoreHorizontal } from 'lucide-react';
import type { QueueItem } from '@/types';
import { useApi } from '@/hooks/useApi';
import { queueService } from '@/services/messageService';
import { formatDateTime, formatNumber } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Dropdown } from '@/components/ui/Dropdown';
import { ErrorState } from '@/components/ui/States';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { toastSuccess, toastError, toastInfo } from '@/store/toastStore';

export default function MessageQueuePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchQueue = useCallback(() => queueService.getQueue(), []);
  const queue = useApi<QueueItem[]>(fetchQueue, []);
  const queueStats = useApi(() => queueService.getStats(), []);

  const stats = useMemo(() => {
    const s = queueStats.data;
    return {
      pending: s?.pending ?? 0,
      processing: s?.processing ?? 0,
      sent: s?.sent ?? 0,
      failed: s?.failed ?? 0,
      total: s?.total ?? 0,
    };
  }, [queueStats.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (queue.data ?? []).filter((item) => {
      const matchesSearch =
        !q ||
        item.recipient.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.campaignName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [queue.data, search, statusFilter]);

  const cancel = async (item: QueueItem) => {
    try {
      await queueService.cancelItem(item.id);
      toastInfo('Message cancelled', `Message to ${item.recipient} was cancelled.`);
      queue.reload();
    } catch {
      toastError('Failed to cancel message');
    }
  };

  const retry = async (item: QueueItem) => {
    try {
      await queueService.retryItem(item.id);
      toastSuccess('Message queued to retry', `Message to ${item.recipient} was requeued.`);
      queue.reload();
    } catch {
      toastError('Failed to retry message');
    }
  };

  const columns: Column<QueueItem>[] = useMemo(() => {
    const actions = (item: QueueItem) => (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          align="right"
          width="w-48"
          trigger={
            <span className="inline-flex rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          }
          items={[
            { key: 'cancel', label: 'Cancel message', icon: <Ban className="h-4 w-4" />, onClick: () => cancel(item), disabled: !['Pending', 'Processing'].includes(item.status) },
            { key: 'retry', label: 'Retry', icon: <RotateCcw className="h-4 w-4" />, onClick: () => retry(item), disabled: item.status !== 'Failed' },
          ]}
        />
      </div>
    );

    return [
      {
        key: 'recipient',
        header: 'Recipient',
        sortValue: (item) => item.recipient,
        render: (item) => (
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-100">{item.recipient}</p>
            <p className="text-xs text-surface-400">{item.phone}</p>
          </div>
        ),
      },
      { key: 'campaign', header: 'Campaign', sortValue: (item) => item.campaignName, render: (item) => <span className="text-sm text-surface-600 dark:text-surface-300">{item.campaignName}</span> },
      { key: 'sender', header: 'Sender', sortValue: (item) => item.senderName, render: (item) => <span className="text-sm text-surface-600 dark:text-surface-300">{item.senderName}</span> },
      { key: 'status', header: 'Status', sortValue: (item) => item.status, render: (item) => <Badge status={item.status} dot>{item.status}</Badge> },
      { key: 'scheduled', header: 'Scheduled', sortValue: (item) => item.scheduledAt, render: (item) => <span className="text-xs text-surface-500">{formatDateTime(item.scheduledAt)}</span> },
      { key: 'attempts', header: 'Attempts', align: 'right', sortValue: (item) => item.attempts, render: (item) => <span className="text-surface-600 dark:text-surface-300">{item.attempts}</span> },
      { key: 'actions', header: '', align: 'right', render: actions },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.data]);

  if (queue.error) {
    return <ErrorState message="We couldn't load the message queue." onRetry={queue.reload} />;
  }

  return (
    <div>
      <PageHeader
        title="Message Queue"
        subtitle={`${formatNumber(stats.total)} messages in queue`}
        crumbs={[{ label: 'Message Queue' }]}
      />

      {queue.loading || queueStats.loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Clock} label="Pending" value={formatNumber(stats.pending)} iconColor="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
          <StatCard icon={ListOrdered} label="Processing" value={formatNumber(stats.processing)} iconColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
          <StatCard icon={RotateCcw} label="Sent" value={formatNumber(stats.sent)} iconColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={Ban} label="Failed" value={formatNumber(stats.failed)} iconColor="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
        </div>
      )}

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search recipient, phone or campaign..." className="w-full sm:max-w-xs" />
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
            options={[
              { value: '', label: 'All Status' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Processing', label: 'Processing' },
              { value: 'Sent', label: 'Sent' },
              { value: 'Failed', label: 'Failed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            aria-label="Filter by status"
          />
          {(search || statusFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(item) => item.id}
        loading={queue.loading}
        defaultSort={{ key: 'scheduled', dir: 'desc' }}
        empty={{
          icon: ListOrdered,
          title: 'Queue is empty',
          description: 'Messages waiting to be sent will appear here.',
        }}
      />
    </div>
  );
}
