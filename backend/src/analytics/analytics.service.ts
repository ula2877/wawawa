import { Injectable } from '@nestjs/common';
import { CampaignRecipientStatus } from '../generated/prisma/client.js';
import { DashboardService, type SeriesBucket } from '../dashboard/dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AnalyticsSummaryResult {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
  pending: number;
  delivery_rate: number;
  read_rate: number;
  failure_rate: number;
}

export interface ProviderSlice {
  name: string;
  value: number;
}

export interface CampaignPerformanceRow {
  id: number;
  name: string;
  recipients: number;
  delivered: number;
  read: number;
  failed: number;
  rate: number;
}

export interface SenderPerformanceRow {
  name: string;
  phone: string | null;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  rate: number;
}

/**
 * Analytics resource for the Analytics screen: headline totals, trend series
 * and per-campaign/sender breakdowns, all derived from real rows. The trend
 * series and delivery donut reuse the dashboard queries so both screens agree.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  async summary(): Promise<AnalyticsSummaryResult> {
    const [sent, delivered, read, failed, pending] = await Promise.all([
      this.prisma.campaignRecipient.count({ where: { sentAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { deliveredAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { readAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { failedAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { status: CampaignRecipientStatus.PENDING } }),
    ]);

    const rate = (part: number): number => (sent > 0 ? Math.round((part / sent) * 1000) / 10 : 0);

    return {
      total_sent: sent,
      total_delivered: delivered,
      total_read: read,
      total_failed: failed,
      pending,
      delivery_rate: rate(delivered),
      read_rate: rate(read),
      failure_rate: rate(failed),
    };
  }

  performance(range?: string): Promise<{ data: SeriesBucket[] }> {
    return this.dashboard.performance(range);
  }

  stats(): Promise<{ data: { name: string; value: number }[] }> {
    return this.dashboard.stats();
  }

  async providers(): Promise<{ data: ProviderSlice[] }> {
    const groups = await this.prisma.whatsAppMessage.groupBy({
      by: ['accountId'],
      where: { sentAt: { not: null } },
      _count: { _all: true },
    });

    if (groups.length === 0) return { data: [] };

    const accounts = await this.prisma.whatsAppAccount.findMany({
      where: { id: { in: groups.map((g) => g.accountId) } },
      select: { id: true, name: true },
    });

    const names = new Map(accounts.map((a) => [a.id, a.name]));
    const data = groups
      .map((g) => ({ name: names.get(g.accountId) ?? g.accountId, value: g._count._all }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    return { data };
  }

  async topCampaigns(): Promise<{ data: CampaignPerformanceRow[] }> {
    const rows = await this.prisma.campaignRecipient.findMany({
      select: { campaignId: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true },
    });

    interface Counts {
      recipients: number;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    }

    const byCampaign = new Map<number, Counts>();
    for (const row of rows) {
      if (row.campaignId == null) continue;
      const counts = byCampaign.get(row.campaignId) ?? { recipients: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      counts.recipients += 1;
      if (row.sentAt) counts.sent += 1;
      if (row.deliveredAt) counts.delivered += 1;
      if (row.readAt) counts.read += 1;
      if (row.failedAt) counts.failed += 1;
      byCampaign.set(row.campaignId, counts);
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: [...byCampaign.keys()] } },
      select: { id: true, name: true },
    });
    const names = new Map(campaigns.map((c) => [c.id, c.name]));

    const data = [...byCampaign.entries()]
      .map(([id, c]) => ({
        id,
        name: names.get(id) ?? `Campaign #${id}`,
        recipients: c.recipients,
        delivered: c.delivered,
        read: c.read,
        failed: c.failed,
        rate: Math.round((c.delivered / c.recipients) * 1000) / 10,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    return { data };
  }

  async senders(): Promise<{ data: SenderPerformanceRow[] }> {
    const rows = await this.prisma.whatsAppMessage.findMany({
      where: { OR: [{ sentAt: { not: null } }, { failedAt: { not: null } }] },
      select: { accountId: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true },
    });

    interface Counts {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    }

    const byAccount = new Map<string, Counts>();
    for (const row of rows) {
      const counts = byAccount.get(row.accountId) ?? { sent: 0, delivered: 0, read: 0, failed: 0 };
      if (row.sentAt) counts.sent += 1;
      if (row.deliveredAt) counts.delivered += 1;
      if (row.readAt) counts.read += 1;
      if (row.failedAt) counts.failed += 1;
      byAccount.set(row.accountId, counts);
    }

    if (byAccount.size === 0) return { data: [] };

    const accounts = await this.prisma.whatsAppAccount.findMany({
      where: { id: { in: [...byAccount.keys()] } },
      select: { id: true, name: true, phone: true },
    });
    const meta = new Map(accounts.map((a) => [a.id, a]));

    const data = [...byAccount.entries()]
      .map(([id, c]) => ({
        name: meta.get(id)?.name ?? id,
        phone: meta.get(id)?.phone ?? null,
        sent: c.sent,
        delivered: c.delivered,
        read: c.read,
        failed: c.failed,
        rate: c.sent > 0 ? Math.round((c.delivered / c.sent) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.sent - a.sent);

    return { data };
  }
}