import { Injectable } from '@nestjs/common';
import { WhatsAppMessageStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

const SETTINGS_ID = 1;

const SETTINGS_DEFAULTS = {
  companyName: '',
  timezone: 'Asia/Jakarta',
  language: 'id',
  defaultSenderId: null as string | null,
  rateLimitPerMin: 60,
  retryLimit: 3,
  delayBetweenMs: 500,
  notifyCampaignCompleted: true,
  notifyCampaignFailed: true,
  notifyConnectionError: true,
  notifyLowQuota: true,
  messageQuota: 100000,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const [row, messagesUsed] = await Promise.all([
      this.prisma.workspaceSettings.upsert({
        where: { id: SETTINGS_ID },
        update: {},
        create: { id: SETTINGS_ID, ...SETTINGS_DEFAULTS },
      }),
      this.prisma.whatsAppMessage.count({
        where: { status: WhatsAppMessageStatus.SENT },
      }),
    ]);

    return { data: this.toSettings(row, messagesUsed) };
  }

  async update(dto: UpdateSettingsDto) {
    await this.prisma.workspaceSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { ...dto },
      create: { id: SETTINGS_ID, ...SETTINGS_DEFAULTS, ...dto },
    });

    const { data } = await this.get();
    return { message: 'Settings updated.', data };
  }

  private toSettings(
    row: {
      companyName: string;
      timezone: string;
      language: string;
      defaultSenderId: string | null;
      rateLimitPerMin: number;
      retryLimit: number;
      delayBetweenMs: number;
      notifyCampaignCompleted: boolean;
      notifyCampaignFailed: boolean;
      notifyConnectionError: boolean;
      notifyLowQuota: boolean;
      messageQuota: number;
    },
    messagesUsed: number,
  ) {
    return {
      general: {
        companyName: row.companyName,
        timezone: row.timezone,
        language: row.language,
      },
      whatsapp: {
        defaultSenderId: row.defaultSenderId ?? '',
        rateLimitPerMin: row.rateLimitPerMin,
        retryLimit: row.retryLimit,
        delayBetweenMs: row.delayBetweenMs,
      },
      notifications: {
        campaignCompleted: row.notifyCampaignCompleted,
        campaignFailed: row.notifyCampaignFailed,
        connectionError: row.notifyConnectionError,
        lowQuota: row.notifyLowQuota,
      },
      billing: {
        messagesUsed,
        messageQuota: row.messageQuota,
      },
    };
  }
}