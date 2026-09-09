import { Injectable } from '@nestjs/common';
import { formatDateTime } from '../common/laravel-pagination.js';
import {
  CampaignStatus,
  WhatsAppAccountStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

export type NotificationType = 'Success' | 'Error' | 'Warning' | 'Info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
}

/**
 * Builds the notification feed from real data, honouring the notification
 * toggles configured on the Settings page. Read state is kept in the browser
 * (frontend), so every item is returned as unread.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async index(): Promise<{ data: NotificationItem[] }> {
    const { data } = await this.settings.get();
    const toggles = data.notifications;
    const items: NotificationItem[] = [];

    if (toggles.campaignCompleted) {
      const completed = await this.prisma.campaign.findMany({
        where: { status: CampaignStatus.COMPLETED },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });
      for (const c of completed) {
        items.push({
          id: `nt-campaign-completed-${c.id}`,
          type: 'Success',
          title: 'Campaign completed',
          message: `Campaign "${c.name}" completed successfully.`,
          time: formatDateTime(c.completedAt ?? c.updatedAt) ?? '',
          read: false,
          link: `/campaigns/${c.id}`,
        });
      }
    }

    if (toggles.campaignFailed) {
      const failed = await this.prisma.campaign.findMany({
        where: { status: CampaignStatus.FAILED },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      });
      for (const c of failed) {
        items.push({
          id: `nt-campaign-failed-${c.id}`,
          type: 'Error',
          title: 'Campaign failed',
          message: `Campaign "${c.name}" failed to complete.`,
          time: formatDateTime(c.updatedAt) ?? '',
          read: false,
          link: `/campaigns/${c.id}`,
        });
      }
    }

    if (toggles.connectionError) {
      const accounts = await this.prisma.whatsAppAccount.findMany({
        where: {
          status: {
            in: [WhatsAppAccountStatus.DISCONNECTED, WhatsAppAccountStatus.LOGGED_OUT],
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });
      for (const account of accounts) {
        items.push({
          id: `nt-connection-${account.id}`,
          type: 'Error',
          title: 'Connection error',
          message: `WhatsApp account "${account.name}" is disconnected.`,
          time: formatDateTime(account.lastDisconnectedAt ?? account.updatedAt) ?? '',
          read: false,
          link: '/whatsapp-accounts',
        });
      }
    }

    if (toggles.lowQuota) {
      const pct =
        data.billing.messageQuota > 0
          ? (data.billing.messagesUsed / data.billing.messageQuota) * 100
          : 0;
      if (pct >= 90) {
        items.push({
          id: 'nt-low-quota',
          type: 'Warning',
          title: 'Low message quota',
          message: `You have used ${data.billing.messagesUsed.toLocaleString()} of ${data.billing.messageQuota.toLocaleString()} messages this month.`,
          time: formatDateTime(new Date()) ?? '',
          read: false,
          link: '/settings',
        });
      }
    }

    items.sort(
      (a, b) =>
        new Date(b.time.replace(' ', 'T')).getTime() -
        new Date(a.time.replace(' ', 'T')).getTime(),
    );

    return { data: items.slice(0, 20) };
  }
}