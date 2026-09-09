import { useMemo, useState } from 'react';
import { Send, CheckCircle2, BookOpenCheck, XCircle, RefreshCw, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { analyticsService } from '@/services/analyticsService';
import { formatNumber, formatCompact, formatPercent, cx } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { LineChartView, AreaChartView, BarChartView, DonutChartView, ChartCard } from '@/components/domain/Chart';
import { CHART_COLORS } from '@/components/domain/Chart';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [refreshKey, setRefreshKey] = useState(0);

  const kpis = useApi(() => analyticsService.getKpis(), [refreshKey]);
  const performance = useApi(() => analyticsService.getPerformanceSeries(range), [range, refreshKey]);
  const stats = useApi(() => analyticsService.getMessageStats(), [refreshKey]);
  const providers = useApi(() => analyticsService.getProviderStats(), [refreshKey]);
  const topCampaigns = useApi(() => analyticsService.getTopCampaigns(), [refreshKey]);
  const senderPerf = useApi(() => analyticsService.getSenderPerformance(), [refreshKey]);

  const campaignBarData = useMemo(
    () => (topCampaigns.data ?? []).map((c) => ({ name: c.name, delivered: c.delivered, read: c.read, failed: c.failed })),
    [topCampaigns.data],
  );

  const donutTotal = useMemo(() => (stats.data ?? []).reduce((a, b) => a + b.value, 0), [stats.data]);

  const isAnyError = kpis.error || performance.error || topCampaigns.error || senderPerf.error;
  const reloadAll = () => {
    kpis.reload();
    performance.reload();
    stats.reload();
    providers.reload();
    topCampaigns.reload();
    senderPerf.reload();
  };

  const rangeLabel = useMemo(() => {
    if (range === 'today') return 'today';
    if (range === '7d') return 'last 7 days';
    if (range === '30d') return 'last 30 days';
    return 'last 90 days';
  }, [range]);

  const campaignColumns: Column<{ id: string; name: string; recipients: number; delivered: number; read: number; failed: number; rate: number }>[] = [
    {
      key: 'name',
      header: 'Campaign',
      sortValue: (c) => c.name,
      render: (c) => <span className="font-medium text-surface-900 dark:text-surface-100">{c.name}</span>,
    },
    { key: 'recipients', header: 'Recipients', align: 'right', sortValue: (c) => c.recipients, render: (c) => formatNumber(c.recipients) },
    { key: 'delivered', header: 'Delivered', align: 'right', sortValue: (c) => c.delivered, render: (c) => formatNumber(c.delivered) },
    { key: 'read', header: 'Read', align: 'right', sortValue: (c) => c.read, render: (c) => formatNumber(c.read) },
    { key: 'failed', header: 'Failed', align: 'right', sortValue: (c) => c.failed, render: (c) => <span className={cx(c.failed > 0 && 'font-medium text-rose-500')}>{formatNumber(c.failed)}</span> },
    { key: 'rate', header: 'Delivery', align: 'right', sortValue: (c) => c.rate, render: (c) => <span className="font-medium text-whatsapp-600 dark:text-whatsapp-400">{formatPercent(c.rate)}</span> },
  ];

  const senderColumns: Column<{ name: string; phone: string; sent: number; delivered: number; read: number; failed: number; rate: number }>[] = [
    {
      key: 'name',
      header: 'Sender',
      sortValue: (s) => s.name,
      render: (s) => (
        <div>
          <p className="font-medium text-surface-900 dark:text-surface-100">{s.name}</p>
          <p className="text-xs text-surface-400">{s.phone}</p>
        </div>
      ),
    },
    { key: 'sent', header: 'Sent', align: 'right', sortValue: (s) => s.sent, render: (s) => formatNumber(s.sent) },
    { key: 'delivered', header: 'Delivered', align: 'right', sortValue: (s) => s.delivered, render: (s) => formatNumber(s.delivered) },
    { key: 'read', header: 'Read', align: 'right', sortValue: (s) => s.read, render: (s) => formatNumber(s.read) },
    { key: 'failed', header: 'Failed', align: 'right', sortValue: (s) => s.failed, render: (s) => <span className={cx(s.failed > 0 && 'font-medium text-rose-500')}>{formatNumber(s.failed)}</span> },
    { key: 'rate', header: 'Rate', align: 'right', sortValue: (s) => s.rate, render: (s) => <span className="font-medium text-whatsapp-600 dark:text-whatsapp-400">{formatPercent(s.rate)}</span> },
  ];

  if (isAnyError) {
    return <ErrorState message="We couldn't load the analytics data." onRetry={reloadAll} />;
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Performance of your WhatsApp messaging"
        crumbs={[{ label: 'Analytics' }]}
        actions={
          <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {kpis.loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Send} label="Total Sent" value={formatNumber(kpis.data?.totalSent ?? 0)} iconColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
          <StatCard icon={CheckCircle2} label="Total Delivered" value={formatNumber(kpis.data?.totalDelivered ?? 0)} iconColor="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
          <StatCard icon={BookOpenCheck} label="Total Read" value={formatNumber(kpis.data?.totalRead ?? 0)} iconColor="bg-whatsapp-500/10 text-whatsapp-600 dark:text-whatsapp-400" />
          <StatCard icon={XCircle} label="Total Failed" value={formatNumber(kpis.data?.totalFailed ?? 0)} iconColor="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
        </div>
      )}

      {kpis.loading ? null : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Send} label="Delivery Rate" value={formatPercent(kpis.data?.deliveryRate ?? 0)} iconColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={BookOpenCheck} label="Read Rate" value={formatPercent(kpis.data?.readRate ?? 0)} iconColor="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
          <StatCard icon={XCircle} label="Failure Rate" value={formatPercent(kpis.data?.failureRate ?? 0)} iconColor="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
          <StatCard icon={Clock} label="Pending" value={formatNumber(kpis.data?.pending ?? 0)} iconColor="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Messages Sent"
          subtitle={`Messages over ${rangeLabel}`}
          loading={performance.loading}
          height={300}
          actions={
            <div className="flex rounded-lg bg-surface-100 p-0.5 dark:bg-surface-800">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cx(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    range === r.key
                      ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-surface-100'
                      : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        >
          <LineChartView
            data={(performance.data ?? []).map((d) => ({ ...d }))}
            xKey="date"
            height={300}
            series={[
              { key: 'sent', name: 'Sent', color: CHART_COLORS.sent },
              { key: 'delivered', name: 'Delivered', color: CHART_COLORS.delivered },
              { key: 'read', name: 'Read', color: CHART_COLORS.read },
            ]}
          />
        </ChartCard>

        <ChartCard title="Message Stats" subtitle="Delivery breakdown" loading={stats.loading} height={300}>
          <DonutChartView data={(stats.data ?? []).map((s) => ({ ...s }))} height={300} centerValue={formatCompact(donutTotal)} centerLabel="messages" />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Delivery Performance"
          subtitle={`Delivered vs read ${rangeLabel}`}
          loading={performance.loading}
          height={280}
        >
          <AreaChartView
            data={(performance.data ?? []).map((d) => ({ ...d }))}
            xKey="date"
            height={280}
            series={[
              { key: 'delivered', name: 'Delivered', color: CHART_COLORS.delivered },
              { key: 'read', name: 'Read', color: CHART_COLORS.read },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Campaign Performance"
          subtitle="Top campaigns by delivery"
          loading={topCampaigns.loading}
          height={280}
        >
          <BarChartView
            data={campaignBarData}
            xKey="name"
            height={280}
            series={[
              { key: 'delivered', name: 'Delivered', color: CHART_COLORS.delivered },
              { key: 'read', name: 'Read', color: CHART_COLORS.read },
            ]}
          />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6">
        <Card title="Top Campaigns" subtitle="Ranked by delivery rate">
          <DataTable
            columns={campaignColumns}
            data={topCampaigns.data ?? []}
            rowKey={(c) => c.id}
            loading={topCampaigns.loading}
            defaultSort={{ key: 'rate', dir: 'desc' }}
            showPagination={false}
            dense
            mobileCard={{
              title: (c) => campaignColumns.find((col) => col.key === 'name')!.render!(c),
              fields: [
                { label: 'Recipients', render: (c) => formatNumber(c.recipients) },
                { label: 'Delivered', render: (c) => formatNumber(c.delivered) },
                { label: 'Read', render: (c) => formatNumber(c.read) },
                { label: 'Failed', render: (c) => formatNumber(c.failed) },
                { label: 'Rate', render: (c) => formatPercent(c.rate) },
              ],
            }}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Sender Performance" subtitle="Sender-wise message stats" className="xl:col-span-2">
          <DataTable
            columns={senderColumns}
            data={senderPerf.data ?? []}
            rowKey={(s) => s.name}
            loading={senderPerf.loading}
            defaultSort={{ key: 'sent', dir: 'desc' }}
            showPagination={false}
            dense
            mobileCard={{
              title: (s) => senderColumns.find((col) => col.key === 'name')!.render!(s),
              fields: [
                { label: 'Phone', render: (s) => s.phone },
                { label: 'Sent', render: (s) => formatNumber(s.sent) },
                { label: 'Delivered', render: (s) => formatNumber(s.delivered) },
                { label: 'Read', render: (s) => formatNumber(s.read) },
                { label: 'Failed', render: (s) => formatNumber(s.failed) },
                { label: 'Rate', render: (s) => formatPercent(s.rate) },
              ],
            }}
          />
        </Card>

        <ChartCard
          title="Provider Share"
          subtitle="Messages sent per provider"
          loading={providers.loading}
          height={260}
        >
          <DonutChartView
            data={(providers.data ?? []).map((s) => ({ name: s.name, value: s.value }))}
            height={260}
            centerValue={formatCompact((providers.data ?? []).reduce((a, b) => a + b.value, 0))}
            centerLabel="sent"
          />
        </ChartCard>
      </div>
    </div>
  );
}
