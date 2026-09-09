import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users, Send, CheckCircle2, BookOpenCheck, XCircle, ArrowLeft,
  Pencil, Copy, PauseCircle, PlayCircle, FileDown,
} from 'lucide-react';
import type { Campaign, CampaignRecipient } from '@/types';
import { useApi } from '@/hooks/useApi';
import { campaignService } from '@/services/campaignService';
import { formatNumber, formatPercent, formatDateTime, cx } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CampaignStatusBadge } from '@/components/domain/CampaignStatusBadge';
import { LineChartView, ChartCard } from '@/components/domain/Chart';
import { CHART_COLORS } from '@/components/domain/Chart';
import { toastSuccess, toastError, toastInfo } from '@/store/toastStore';
import { WhatsAppPreview } from '@/components/domain/WhatsAppPreview';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'pause' | 'resume' | 'duplicate' | 'export' | 'delete' | null>(null);

  const fetchCampaign = useCallback(() => campaignService.getCampaign(id ?? ''), [id]);
  const campaign = useApi<Campaign | undefined>(fetchCampaign, [id]);

  const fetchRecipients = useCallback(() => campaignService.getCampaignRecipients(id ?? '', { per_page: 25 }), [id]);
  const recipients = useApi<{ data: CampaignRecipient[]; meta: { total: number; current_page: number } }>(fetchRecipients, [id]);

  const fetchSeries = useCallback(async () => {
    const points = await campaignService.getSentOverTime(id ?? '');
    return points.map((p) => ({
      date: formatHourBucket(p.bucket),
      sent: p.sent,
      delivered: p.delivered,
      read: p.read,
    }));
  }, [id]);

  const chart = useApi(fetchSeries, [id]);

  const c = campaign.data;

  const doConfirm = async () => {
    if (!c || !confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction === 'pause') {
        await campaignService.pauseCampaign(c.id);
        toastInfo('Campaign paused', `"${c.name}" is now paused.`);
      } else if (confirmAction === 'resume') {
        await campaignService.resumeCampaign(c.id);
        toastSuccess('Campaign resumed', `"${c.name}" is running again.`);
      } else if (confirmAction === 'duplicate') {
        const copy = await campaignService.duplicateCampaign(c.id);
        toastSuccess('Campaign duplicated', `Copy "${copy.name}" created.`);
        campaign.reload();
      } else if (confirmAction === 'export') {
        toastSuccess('Report exported', 'The CSV report was downloaded (mock).');
      } else if (confirmAction === 'delete') {
        await campaignService.deleteCampaign(c.id);
        toastSuccess('Campaign deleted', `"${c.name}" was removed.`);
        navigate('/campaigns');
      }
      setConfirmAction(null);
      campaign.reload();
    } catch {
      toastError('Action failed', 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (campaign.loading) return <PageLoader label="Loading campaign..." />;

  if (campaign.error || !c) {
    return <ErrorState message="We couldn't load this campaign." onRetry={campaign.reload} />;
  }

  const deliveryRate = c.recipients ? (c.delivered / c.recipients) * 100 : 0;
  const readRate = c.delivered ? (c.read / c.delivered) * 100 : 0;
  const progress = c.progress ?? (c.recipients ? Math.round((c.sent / c.recipients) * 100) : 0);
  const rows = (recipients.data?.data ?? []).map((r) => ({ ...r, campaignId: c.id }));

  const statusColumn: Column<typeof rows[number]>[] = [
    { key: 'name', header: 'Contact', sortValue: (r) => r.name, render: (r) => <span className="font-medium text-surface-900 dark:text-surface-100">{r.name}</span> },
    { key: 'phone', header: 'Phone', sortValue: (r) => r.phone, render: (r) => <span className="text-xs text-surface-500">{r.phone}</span> },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'sent', header: 'Sent', align: 'right', sortValue: () => 1, render: () => <CheckCheckIcon /> },
    { key: 'delivered', header: 'Delivered', align: 'right', sortValue: () => 1, render: (r) => <StatusTick done={!!r.deliveredAt} fail={r.status === 'Failed'} /> },
    { key: 'read', header: 'Read', align: 'right', sortValue: () => 1, render: (r) => (r.readAt ? <ReadTick /> : <StatusTick done={false} />) },
    { key: 'error', header: 'Error', render: (r) => (r.error ? <span className="text-xs text-rose-500">{r.error}</span> : <span className="text-surface-300">—</span>) },
  ];

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={`${c.id} · Created ${formatDateTime(c.createdAt)}`}
        crumbs={[{ label: 'Campaigns', to: '/campaigns' }, { label: c.name }]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => (c.status === 'Paused' ? setConfirmAction('resume') : setConfirmAction('pause'))}
              disabled={!['Running', 'Scheduled', 'Paused'].includes(c.status)}
            >
              {c.status === 'Paused' ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {c.status === 'Paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmAction('duplicate')}>
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
            <Button variant="outline" onClick={() => setConfirmAction('export')}>
              <FileDown className="h-4 w-4" /> Export Report
            </Button>
            <Button onClick={() => navigate(`/campaigns/${c.id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2">
        <CampaignStatusBadge status={c.status} />
        <span className="min-w-0 text-sm text-surface-500 dark:text-surface-400">
          {c.scheduledAt ? <>Scheduled for {formatDateTime(c.scheduledAt)}</> : 'Not scheduled'}
        </span>
        <button onClick={() => navigate('/campaigns')} className="ml-auto inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-600">
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Recipients" value={formatNumber(c.recipients)} iconColor="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
        <StatCard icon={Send} label="Sent" value={formatNumber(c.sent)} iconColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        <StatCard icon={CheckCircle2} label="Delivered" value={formatNumber(c.delivered)} iconColor="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
        <StatCard icon={BookOpenCheck} label="Read" value={formatNumber(c.read)} iconColor="bg-whatsapp-500/10 text-whatsapp-600 dark:text-whatsapp-400" />
        <StatCard icon={XCircle} label="Failed" value={formatNumber(c.failed)} iconColor="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
      </div>

      <Card className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Campaign progress</h3>
            <p className="mt-0.5 text-xs text-surface-400">
              {formatNumber(c.sent)} of {formatNumber(c.recipients)} recipients · {formatPercent(progress, 0)} complete
            </p>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100">{progress}%</span>
        </div>
        <ProgressBar value={progress} tone={c.status === 'Failed' ? 'rose' : 'green'} size="lg" />
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-surface-400">Delivery rate</p>
            <p className="font-semibold text-surface-800 dark:text-surface-100">{formatPercent(deliveryRate)}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400">Read rate</p>
            <p className="font-semibold text-surface-800 dark:text-surface-100">{formatPercent(readRate)}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400">Failure rate</p>
            <p className="font-semibold text-surface-800 dark:text-surface-100">{formatPercent(c.recipients ? (c.failed / c.recipients) * 100 : 0)}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Sent over time"
          subtitle="Messages sent per hour during this campaign"
          loading={chart.loading}
          height={260}
        >
          {chart.data && chart.data.length > 0 ? (
            <LineChartView
              data={chart.data}
              xKey="date"
              height={260}
              series={[
                { key: 'sent', name: 'Sent', color: CHART_COLORS.sent },
                { key: 'delivered', name: 'Delivered', color: CHART_COLORS.delivered },
                { key: 'read', name: 'Read', color: CHART_COLORS.read },
              ]}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-surface-400">
              No sending activity recorded yet.
            </div>
          )}
        </ChartCard>

        <Card title="Message preview" subtitle="Message sent to recipients" padded={false} bodyClassName="p-4">
          <WhatsAppPreview
            senderName={c.senderName}
            recipientName="Budi"
            message={c.message}
            mediaType={c.mediaType}
            mediaName={c.mediaName}
          />
        </Card>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-surface-900 dark:text-surface-100">Recipient status</h3>
        <DataTable
          columns={statusColumn}
          data={rows}
          rowKey={(r) => r.id}
          pageSize={10}
          loading={recipients.loading}
          defaultSort={{ key: 'name', dir: 'asc' }}
          mobileCard={{
            title: (r) => statusColumn.find((col) => col.key === 'name')!.render!(r),
            fields: [
              { label: 'Phone', render: (r) => r.phone },
              { label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
              { label: 'Error', render: (r) => (r.error ? r.error : '—') },
            ],
          }}
          empty={{
            icon: Users,
            title: 'No recipients yet',
            description: 'Recipients will appear here once the campaign starts.',
          }}
        />
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={doConfirm}
        loading={busy}
        title={
          confirmAction === 'pause' ? 'Pause Campaign?'
          : confirmAction === 'resume' ? 'Resume Campaign?'
          : confirmAction === 'duplicate' ? 'Duplicate Campaign?'
          : confirmAction === 'delete' ? 'Delete Campaign?' : 'Export Report?'
        }
        message={
          confirmAction === 'pause' ? (
            <>Pause <b>{c.name}</b>? Remaining messages will be put on hold.</>
          ) : confirmAction === 'resume' ? (
            <>Resume <b>{c.name}</b>? It will continue sending to the remaining recipients.</>
          ) : confirmAction === 'duplicate' ? (
            <>Create a copy of <b>{c.name}</b>? The copy will be saved as a draft.</>
          ) : confirmAction === 'delete' ? (
            <>Delete <b>{c.name}</b> permanently? This cannot be undone.</>
          ) : (
            <>Download a CSV report for <b>{c.name}</b>?</>
          )
        }
        confirmLabel={
          confirmAction === 'pause' ? 'Pause Campaign'
          : confirmAction === 'resume' ? 'Resume Campaign'
          : confirmAction === 'duplicate' ? 'Duplicate'
          : 'Confirm'
        }
        confirmVariant={confirmAction === 'delete' || confirmAction === 'pause' ? 'danger' : 'primary'}
      />
    </div>
  );
}

function formatHourBucket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:00`;
}

function CheckCheckIcon() {
  return <span className="inline-flex text-whatsapp-500"><CheckCheckSvg /></span>;
}

function ReadTick() {
  return <span className="inline-flex text-sky-500"><CheckCheckSvg /></span>;
}

function CheckCheckSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-3.5 6-3.5c2 0 3.5 1.5 5 3" />
      <path d="M4 14.5s3.5 3 5 1.5c.8-.8 1.5-1.4 2.2-1.4 1 0 1.5.5 2.8 1.2" />
      <path d="M14 10c0-.7.6-1.3 1.3-1.3.7 0 1.3.6 1.3 1.3 0 .7 0 3 0 3" />
    </svg>
  );
}

function StatusTick({ done, fail }: { done: boolean; fail?: boolean }) {
  if (fail) return <span className="inline-flex text-rose-500"><XCircle className="h-4 w-4" /></span>;
  return (
    <span className={cx('inline-flex', done ? 'text-whatsapp-500' : 'text-surface-300')}>
      {done ? <CheckIconSvg /> : <TextTick />}
    </span>
  );
}

function TextTick() {
  return <span className="text-xs text-surface-400">—</span>;
}

function CheckIconSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}