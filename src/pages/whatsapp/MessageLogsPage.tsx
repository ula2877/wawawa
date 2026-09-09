import { useCallback, useMemo, useState } from 'react';
import { FileClock, Eye } from 'lucide-react';
import type { MessageLog, MessageLogStatus } from '@/types';
import { useApi } from '@/hooks/useApi';
import { messageLogService } from '@/services/messageService';
import { campaignService } from '@/services/campaignService';
import { whatsappService } from '@/services/whatsappService';
import { formatDateTime, formatTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorState } from '@/components/ui/States';
import { WhatsAppPreview } from '@/components/domain/WhatsAppPreview';

const STATUSES: { value: MessageLogStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Read', label: 'Read' },
  { value: 'Failed', label: 'Failed' },
];

type LogsResult = { data: MessageLog[]; total: number };

export default function MessageLogsPage() {
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detail, setDetail] = useState<MessageLog | null>(null);

  const fetchLogs = useCallback(() => messageLogService.getLogs(), []);
  const logs = useApi<LogsResult>(fetchLogs, []);
  const campaigns = useApi(() => campaignService.getCampaigns(), []);
  const senders = useApi(() => whatsappService.getAccounts(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (logs.data?.data ?? []).filter((l) => {
      const matchesSearch =
        !q || l.recipient.toLowerCase().includes(q) || l.phone.includes(q) || l.id.toLowerCase().includes(q);
      const matchesCampaign = !campaignFilter || l.campaignId === campaignFilter;
      const matchesSender = !senderFilter || l.senderName === senderFilter;
      const matchesStatus = !statusFilter || l.status === statusFilter;
      const t = new Date(l.time).getTime();
      const matchesFrom = !fromDate || t >= new Date(`${fromDate}T00:00:00`).getTime();
      const matchesTo = !toDate || t <= new Date(`${toDate}T23:59:59`).getTime();
      return matchesSearch && matchesCampaign && matchesSender && matchesStatus && matchesFrom && matchesTo;
    });
  }, [logs.data, search, campaignFilter, senderFilter, statusFilter, fromDate, toDate]);

  const columns: Column<MessageLog>[] = useMemo(() => {
    return [
      { key: 'time', header: 'Time', sortValue: (l) => l.time, render: (l) => <span className="text-xs text-surface-500">{formatDateTime(l.time)}</span> },
      {
        key: 'recipient',
        header: 'Recipient',
        sortValue: (l) => l.recipient,
        render: (l) => (
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-100">{l.recipient}</p>
            <p className="text-xs text-surface-400">{l.phone}</p>
          </div>
        ),
      },
      { key: 'campaign', header: 'Campaign', sortValue: (l) => l.campaignName, render: (l) => <span className="text-sm text-surface-600 dark:text-surface-300">{l.campaignName}</span> },
      {
        key: 'message',
        header: 'Message',
        render: (l) => <span className="block max-w-64 truncate text-sm text-surface-600 dark:text-surface-300">{l.message}</span>,
      },
      { key: 'status', header: 'Status', sortValue: (l) => l.status, render: (l) => <Badge status={l.status} dot>{l.status}</Badge> },
      { key: 'error', header: 'Error', render: (l) => (l.error ? <span className="text-xs text-rose-500">{l.error}</span> : <span className="text-surface-300">—</span>) },
    ];
  }, []);

  const openDetail = (l: MessageLog) => setDetail(l);

  if (logs.error) {
    return <ErrorState message="We couldn't load the message logs." onRetry={logs.reload} />;
  }

  return (
    <div>
      <PageHeader
        title="Message Logs"
        subtitle={`${logs.data?.total ?? 0} message records`}
        crumbs={[{ label: 'Message Logs' }]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="min-w-[16rem] flex-1 basis-64 lg:max-w-[22rem]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search recipient or phone..." />
        </div>
        <div className="w-44 shrink-0">
          <Select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            options={[{ value: '', label: 'All Campaigns' }, ...(campaigns.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
            aria-label="Filter by campaign"
          />
        </div>
        <div className="w-40 shrink-0">
          <Select
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            options={[{ value: '', label: 'All Senders' }, ...(senders.data ?? []).map((s) => ({ value: s.name, label: s.name }))]}
            aria-label="Filter by sender"
          />
        </div>
        <div className="w-36 shrink-0">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All Status' }, ...STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
            aria-label="Filter by status"
          />
        </div>
        <div className="w-40 shrink-0">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
        </div>
        <div className="w-40 shrink-0">
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
        </div>
        {(search || campaignFilter || senderFilter || statusFilter || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCampaignFilter(''); setSenderFilter(''); setStatusFilter(''); setFromDate(''); setToDate(''); }}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(l) => l.id}
        loading={logs.loading}
        onRowClick={openDetail}
        defaultSort={{ key: 'time', dir: 'desc' }}
        pageSize={12}
        mobileCard={{
          title: (l) => l.recipient,
          subtitle: (l) => l.phone,
          fields: [
            { label: 'Status', render: (l) => <Badge status={l.status} dot>{l.status}</Badge> },
            { label: 'Campaign', render: (l) => l.campaignName },
            { label: 'Message', render: (l) => l.message },
            { label: 'Error', render: (l) => (l.error ? l.error : '—') },
            { label: 'Time', render: (l) => formatDateTime(l.time) },
          ],
        }}
        empty={{
          icon: FileClock,
          title: 'No message logs',
          description: 'Sent messages will be recorded here with their delivery status.',
        }}
      />

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="Message detail">
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-surface-900 dark:text-surface-100">{detail.recipient}</p>
                <p className="text-xs text-surface-400">{detail.phone}</p>
              </div>
              <Badge status={detail.status} dot>{detail.status}</Badge>
            </div>

              <dl className="space-y-3 border-y border-surface-100 py-4 text-sm dark:border-surface-800">
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-400">Campaign</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-surface-800 dark:text-surface-100">{detail.campaignName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-400">Sender</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-surface-800 dark:text-surface-100">{detail.senderName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-400">Time</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-surface-800 dark:text-surface-100">{formatDateTime(detail.time)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-400">Log ID</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-surface-800 dark:text-surface-100">{detail.id}</dd>
                </div>
                {detail.error && (
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-surface-500 dark:text-surface-400">Error</dt>
                    <dd className="min-w-0 break-words text-right font-medium text-rose-500">{detail.error}</dd>
                  </div>
                )}
              </dl>

            <div>
              <p className="mb-2 text-xs font-medium text-surface-400">Message preview at {formatTime(detail.time)}</p>
              <WhatsAppPreview
                senderName={detail.senderName}
                recipientName={detail.recipient.split(' ')[0]}
                message={detail.message}
                timestamp={formatTime(detail.time)}
              />
            </div>

            <p className="flex items-center gap-1.5 text-xs text-surface-400">
              <Eye className="h-3.5 w-3.5" /> This log reflects the state at the time of delivery.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
