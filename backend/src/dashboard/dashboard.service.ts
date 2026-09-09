import { Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service.js';
import { CampaignRecipientStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type DashboardRange = 'today' | '7d' | '30d' | '90d';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeriesBucket {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

interface SeriesCounts {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface DashboardSummaryResult {
  total_contacts: number;
  contacts_growth: number;
  campaigns: number;
  campaigns_growth: number;
  messages_sent: number;
  messages_growth: number;
  delivery_rate: number;
  delivery_growth: number;
}

export interface DashboardStatsResult {
  data: { name: string; value: number }[];
}

export interface DashboardActivityEvent {
  id: string;
  user: string;
  action: string;
  module: string;
  date: string;
}

export interface DashboardActivityResult {
  data: DashboardActivityEvent[];
}

/**
 * Real dashboard numbers, all derived from the DB (contacts, campaigns and
 * per-recipient send/delivery/read timestamps). Growth values compare the
 * trailing 30-day window against the 30-day window that preceded it.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async summary(): Promise<DashboardSummaryResult> {
    const now = Date.now();
    const windowStart = new Date(now - 30 * DAY_MS);
    const prevStart = new Date(now - 60 * DAY_MS);

    const [totalContacts, contactsThis, contactsPrev] = await Promise.all([
      this.prisma.contact.count(),
      this.prisma.contact.count({ where: { created_at: { gte: windowStart } } }),
      this.prisma.contact.count({ where: { created_at: { gte: prevStart, lt: windowStart } } }),
    ]);

    const [totalCampaigns, campaignsThis, campaignsPrev] = await Promise.all([
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { createdAt: { gte: windowStart } } }),
      this.prisma.campaign.count({ where: { createdAt: { gte: prevStart, lt: windowStart } } }),
    ]);

    const [sentAll, deliveredAll, sentThis, sentPrev, deliveredThis, deliveredPrev] =
      await Promise.all([
        this.prisma.campaignRecipient.count({ where: { sentAt: { not: null } } }),
        this.prisma.campaignRecipient.count({ where: { deliveredAt: { not: null } } }),
        this.prisma.campaignRecipient.count({ where: { sentAt: { gte: windowStart } } }),
        this.prisma.campaignRecipient.count({ where: { sentAt: { gte: prevStart, lt: windowStart } } }),
        this.prisma.campaignRecipient.count({ where: { deliveredAt: { gte: windowStart } } }),
        this.prisma.campaignRecipient.count({ where: { deliveredAt: { gte: prevStart, lt: windowStart } } }),
      ]);

    return {
      total_contacts: totalContacts,
      contacts_growth: this.growth(contactsThis, contactsPrev),
      campaigns: totalCampaigns,
      campaigns_growth: this.growth(campaignsThis, campaignsPrev),
      messages_sent: sentAll,
      messages_growth: this.growth(sentThis, sentPrev),
      delivery_rate: sentAll > 0 ? (deliveredAll / sentAll) * 100 : 0,
      delivery_growth: this.growth(
        sentThis > 0 ? (deliveredThis / sentThis) * 100 : 0,
        sentPrev > 0 ? (deliveredPrev / sentPrev) * 100 : 0,
      ),
    };
  }

  async performance(range?: string): Promise<{ data: SeriesBucket[] }> {
    const now = Date.now();
    const resolved = this.resolveRange(range);
    let start: number;
    let step: number;
    let label: (t: number) => string;

    switch (resolved) {
      case 'today': {
        start = now - (now % DAY_MS);
        step = 60 * 60 * 1000;
        label = (t) => new Date(t).toISOString().slice(11, 16);
        break;
      }
      case '7d':
        start = now - 6 * DAY_MS;
        step = DAY_MS;
        label = (t) => new Date(t).toISOString().slice(0, 10);
        break;
      case '30d':
        start = now - 29 * DAY_MS;
        step = DAY_MS;
        label = (t) => new Date(t).toISOString().slice(0, 10);
        break;
      case '90d':
        start = now - 89 * DAY_MS;
        step = DAY_MS;
        label = (t) => new Date(t).toISOString().slice(0, 10);
        break;
    }

    const rows = await this.prisma.campaignRecipient.findMany({
      where: {
        OR: [{ sentAt: { gte: new Date(start) } }, { failedAt: { gte: new Date(start) } }],
      },
      select: { sentAt: true, deliveredAt: true, readAt: true, failedAt: true },
    });

    const byBucket = new Map<number, SeriesCounts>();

    const stamp = (at: Date | null, key: 'sent' | 'delivered' | 'read' | 'failed'): void => {
      if (!at) return;
      const t = at.getTime();
      const bucket = t - (t % step);
      const counts = byBucket.get(bucket) ?? { sent: 0, delivered: 0, read: 0, failed: 0 };
      counts[key] += 1;
      byBucket.set(bucket, counts);
    };

    for (const row of rows) {
      stamp(row.sentAt, 'sent');
      stamp(row.deliveredAt, 'delivered');
      stamp(row.readAt, 'read');
      stamp(row.failedAt, 'failed');
    }

    const data: SeriesBucket[] = [];
    for (let t = start - (start % step); t <= now; t += step) {
      const counts = byBucket.get(t) ?? { sent: 0, delivered: 0, read: 0, failed: 0 };
      data.push({ date: label(t), ...counts });
    }

    return { data };
  }

  async stats(): Promise<DashboardStatsResult> {
    const [read, delivered, sent, failed, skipped, total] = await Promise.all([
      this.prisma.campaignRecipient.count({ where: { readAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { deliveredAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { sentAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { failedAt: { not: null } } }),
      this.prisma.campaignRecipient.count({ where: { status: CampaignRecipientStatus.SKIPPED } }),
      this.prisma.campaignRecipient.count(),
    ]);

    const mk = (name: string, value: number) => ({ name, value });

    const data = [
      mk('Read', read),
      mk('Delivered', delivered - read),
      mk('Sent', sent - delivered),
      mk('Failed', failed),
      mk('Skipped', skipped),
      mk('Pending', total - sent - failed - skipped),
    ].filter((s) => s.value > 0);

    return { data };
  }

  async activity(): Promise<DashboardActivityResult> {
    const { data } = await this.activityService.findAll();
    return { data: data.slice(0, 12) };
  }

  private resolveRange(range?: string): DashboardRange {
    return range === 'today' || range === '7d' || range === '30d' || range === '90d'
      ? range
      : '7d';
  }

  private growth(current: number, previous: number): number {
    if (previous <= 0) return 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }
}