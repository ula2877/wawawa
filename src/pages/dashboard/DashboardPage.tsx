import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Send, MessageSquare, Target, Plus, RefreshCw, Activity } from 'lucide-react';
import type { Campaign } from '@/types';
import { useApi } from '@/hooks/useApi';
import { campaignService } from '@/services/campaignService';
import { dashboardService } from '@/services/dashboardService';
import { formatCompact, formatNumber, formatPercent, timeAgo, cx } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { CampaignStatusBadge } from '@/components/domain/CampaignStatusBadge';
import { LineChartView, DonutChartView, ChartCard } from '@/components/domain/Chart';
import { CHART_COLORS } from '@/components/domain/Chart';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
] as const;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('7d');

  const summary = useApi(() => dashboardService.getSummary(), []);
  const performance = useApi(() => dashboardService.getPerformance(range), [range]);
  const stats = useApi(() => dashboardService.getMessageStats(), []);

  const fetchCampaigns = useCallback(() => campaignService.getCampaigns(), []);
  const campaigns = useApi<Campaign[]>(fetchCampaigns, []);

  const activity = useApi(() => dashboardService.getActivity(), []);

  const recentCampaigns = useMemo(() => (campaigns.data ?? []).slice(0, 6), [campaigns.data]);

  const donutTotal = useMemo(() => (stats.data ?? []).reduce((a, b) => a + b.value, 0), [stats.data]);

  const rangeLabel = useMemo(() => {
    if (range === 'today') return 'today';
    if (range === '7d') return 'last 7 days';
    if (range === '30d') return 'last 30 days';
    return 'last 90 days';
  }, [range]);

  if (summary.error || performance.error || campaigns.error) {
    return (
      <ErrorState
        message="We couldn't load your dashboard data."
        onRetry={() => {
          summary.reload();
          performance.reload();
          campaigns.reload();
          stats.reload();
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your WhatsApp campaigns"
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                summary.reload();
                performance.reload();
                stats.reload();
                campaigns.reload();
                activity.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="md" onClick={() => navigate('/campaigns/create')}>
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </>
        }
      />

      {summary.loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total Contacts" value={formatNumber(summary.data?.totalContacts ?? 0)} change={{ value: summary.data?.contactsGrowth ?? 0, label: 'vs last month' }} hint="vs last month" />
          <StatCard icon={Send} label="Campaigns" value={formatNumber(summary.data?.campaigns ?? 0)} change={{ value: summary.data?.campaignsGrowth ?? 0, label: 'vs last month' }} hint="vs last month" iconColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
          <StatCard icon={MessageSquare} label="Messages Sent" value={formatCompact(summary.data?.messagesSent ?? 0)} change={{ value: summary.data?.messagesGrowth ?? 0, label: 'vs last month' }} hint="vs last month" iconColor="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
          <StatCard icon={Target} label="Delivery Rate" value={formatPercent(summary.data?.deliveryRate ?? 0)} change={{ value: summary.data?.deliveryGrowth ?? 0, label: 'vs last month' }} hint="vs last month" iconColor="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Campaign Performance"
            subtitle={`Sent, delivered, read and failed messages ${rangeLabel}`}
            loading={performance.loading}
            height={320}
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
              height={320}
              series={[
                { key: 'sent', name: 'Sent', color: CHART_COLORS.sent },
                { key: 'delivered', name: 'Delivered', color: CHART_COLORS.delivered },
                { key: 'read', name: 'Read', color: CHART_COLORS.read },
                { key: 'failed', name: 'Failed', color: CHART_COLORS.failed },
              ]}
            />
          </ChartCard>
        </div>

        <div className="space-y-6">
          <ChartCard
            title="Message Statistics"
            subtitle="Current delivery breakdown"
            loading={stats.loading}
            height={240}
            actions={
              <Link to="/message-logs" className="text-xs font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400">
                View all
              </Link>
            }
          >
            <DonutChartView data={(stats.data ?? []).map((s) => ({ ...s }))} height={240} centerValue={formatCompact(donutTotal)} centerLabel="messages" />
          </ChartCard>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Recent Campaigns"
          subtitle="Latest campaigns and their delivery status"
          headerClassName="border-0 pb-0"
          bodyClassName="pt-1 px-0 pb-0"
          padded={false}
          actions={
            <Link to="/campaigns" className="text-xs font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400">
              View all
            </Link>
          }
        >
          {campaigns.loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 text-left text-xs uppercase tracking-wide text-surface-400 dark:border-surface-800">
                    <th className="px-5 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Recipients</th>
                    <th className="px-4 py-3 text-center font-semibold">Sent</th>
                    <th className="px-4 py-3 text-center font-semibold">Delivered</th>
                    <th className="px-4 py-3 text-center font-semibold">Read</th>
                    <th className="px-4 py-3 text-center font-semibold">Failed</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                      className="cursor-pointer border-b border-surface-50 transition-colors hover:bg-surface-50 dark:border-surface-800/60 dark:hover:bg-surface-800/40"
                    >
                      <td className="px-5 py-3 font-medium text-surface-900 dark:text-surface-100">{c.name}</td>
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-300">{formatNumber(c.recipients)}</td>
                      <td className="px-4 py-3 text-center text-surface-600 dark:text-surface-300">{formatNumber(c.sent)}</td>
                      <td className="px-4 py-3 text-center text-surface-600 dark:text-surface-300">{formatNumber(c.delivered)}</td>
                      <td className="px-4 py-3 text-center text-surface-600 dark:text-surface-300">{formatNumber(c.read)}</td>
                      <td className="px-4 py-3 text-center text-rose-500">{formatNumber(c.failed)}</td>
                      <td className="px-4 py-3">
                        <CampaignStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3 text-surface-500 dark:text-surface-400">{formatDateShorthand(c.scheduledAt ?? c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Recent Activity" subtitle="Latest events across the app" headerClassName="border-0 pb-0" bodyClassName="pt-2" padded={false}
          actions={
            <Link to="/activity-logs" className="text-xs font-medium text-whatsapp-600 hover:underline dark:text-whatsapp-400">
              View all
            </Link>
          }>
          <div className="px-5 pb-5">
            {activity.loading ? (
              <div className="space-y-4 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ol className="relative ml-2 space-y-5 border-l border-surface-200 pt-1 dark:border-surface-800">
                {(activity.data ?? []).slice(0, 6).map((act) => (
                  <li key={act.id} className="ml-4">
                    <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white bg-whatsapp-500 dark:border-surface-900" />
                    <p className="text-sm text-surface-600 dark:text-surface-300">{act.action}</p>
                    <p className="mt-0.5 text-xs text-surface-400">
                      {act.user} · {timeAgo(act.date)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {!activity.loading && (activity.data ?? []).length === 0 && (
              <div className="py-4">
                <EmptyState icon={Activity} title="No activity yet" description="Events will show up here as they happen." />
              </div>
            )}
          </div>
        </Card>
      </div>

      </div>
  );
}

function formatDateShorthand(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}