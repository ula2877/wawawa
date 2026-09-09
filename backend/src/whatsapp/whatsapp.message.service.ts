import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import {
  CampaignRecipientStatus,
  WhatsAppMessageStatus,
  type WhatsAppMessage,
} from '../generated/prisma/client.js';
import { formatDateTime } from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
import { WhatsAppEventBus } from './whatsapp.events.js';
import { WhatsAppService } from './whatsapp.service.js';

export interface WhatsAppMessageResource {
  id: string;
  account_id: string;
  recipient: string;
  status: WhatsAppMessageStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  wa_message_id: string | null;
  scheduled_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
}

/** Attachment metadata resolved from a campaign before delivery. */
export interface CampaignMediaSend {
  filePath: string;
  type: string;
  name: string | null;
  mimetype: string | null;
}

/**
 * Database-backed message queue. Persistence, atomic claiming and status
 * transitions live here; the actual delivery happens in the worker through
 * WhatsAppManager. All idempotency comes from guarded `updateMany` claims so
 * multiple backend instances cannot double-deliver.
 */
@Injectable()
export class WhatsAppMessageService {
  private readonly maxAttempts: number;
  private readonly retryDelaysMs = [30_000, 300_000, 1_800_000];

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: WhatsAppService,
    private readonly events: WhatsAppEventBus,
    config: ConfigService,
  ) {
    const configured = Number(config.get<string>('WHATSAPP_MAX_MESSAGE_ATTEMPTS'));
    this.maxAttempts = Number.isInteger(configured) && configured > 0 ? configured : 3;
  }

  async enqueue(accountId: string, dto: SendMessageDto) {
    await this.accounts.getRawOrThrow(accountId);

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        accountId,
        recipient: dto.recipient,
        content: dto.content,
        status: WhatsAppMessageStatus.PENDING,
        attempts: 0,
        maxAttempts: this.maxAttempts,
      },
    });

    this.events.emitMessageQueued({ accountId });

    return { data: this.toResource(message) };
  }

  async show(id: string) {
    const message = await this.prisma.whatsAppMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException({ message: 'Not Found' });
    }
    return { data: this.toResource(message) };
  }

  /**
   * Enqueue a message for a campaign recipient. The caller (CampaignProcessor)
   * has already rendered content and validated variables.
   */
  async enqueueForCampaign(
    accountId: string,
    recipientId: number,
    phone: string,
    content: string,
    campaignId: number,
  ): Promise<string> {
    const message = await this.prisma.whatsAppMessage.create({
      data: {
        accountId,
        recipient: phone,
        content,
        status: WhatsAppMessageStatus.PENDING,
        attempts: 0,
        maxAttempts: this.maxAttempts,
        campaignId,
      },
    });

    await this.prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: CampaignRecipientStatus.QUEUED,
        messageId: message.id,
        queuedAt: new Date(),
      },
    });

    this.events.emitMessageQueued({ accountId });

    return message.id;
  }

  async findClaimCandidates(limit: number): Promise<WhatsAppMessage[]> {
    const now = new Date();
    return this.prisma.whatsAppMessage.findMany({
      where: {
        status: WhatsAppMessageStatus.PENDING,
        scheduledAt: { lte: now },
        account: { status: 'CONNECTED' },
        NOT: { campaign: { status: { in: ['PAUSED', 'CANCELLED'] } } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }

  async claim(messageId: string, now = new Date()): Promise<boolean> {
    const result = await this.prisma.whatsAppMessage.updateMany({
      where: { id: messageId, status: WhatsAppMessageStatus.PENDING },
      data: {
        status: WhatsAppMessageStatus.PROCESSING,
        processingStartedAt: now,
      },
    });
    return result.count === 1;
  }

  async markSent(messageId: string, now = new Date(), waMessageId?: string): Promise<void> {
    const message = await this.prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        status: WhatsAppMessageStatus.SENT,
        sentAt: now,
        ...(waMessageId != null ? { waMessageId } : {}),
      },
    });
    this.events.emitMessageSent({
      id: message.id,
      accountId: message.accountId,
      sentAt: now.toISOString(),
    });
    await this.recordCampaignTerminal(message, 'SENT');
  }

  /**
   * A WhatsApp DELIVERY_ACK receipt arrived for one of our queued messages.
   * Find the row by the stored Baileys message key and record when the
   * recipient's device confirmed delivery. Unknown keys (out of history sync,
   * our own mirrored messages, not-yet-persisted rows) are ignored.
   */
  async markDelivered(
    accountId: string,
    waMessageId: string,
    deliveredAt = new Date(),
  ): Promise<void> {
    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { accountId, waMessageId },
    });
    if (!message || message.deliveredAt) {
      return;
    }

    await this.prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: { deliveredAt },
    });
    this.events.emitMessageDelivered({
      id: message.id,
      accountId,
      deliveredAt: deliveredAt.toISOString(),
    });
    await this.recordCampaignReceipt(message, 'deliveredAt', deliveredAt);
  }

  /**
   * A WhatsApp READ receipt arrived: the recipient opened the conversation.
   * Also implied delivery, which keeps the stats numbers monotonic.
   */
  async markRead(
    accountId: string,
    waMessageId: string,
    readAt = new Date(),
  ): Promise<void> {
    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { accountId, waMessageId },
    });
    if (!message || message.readAt) {
      return;
    }

    // A READ receipt implies the device accepted the message, so when the
    // DELIVERY_ACK was not observed separately the message counts as
    // delivered too — keeps stats monotonic.
    const alsoDelivered = message.deliveredAt == null;
    await this.prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: { readAt, ...(alsoDelivered ? { deliveredAt: readAt } : {}) },
    });
    this.events.emitMessageRead({
      id: message.id,
      accountId,
      readAt: readAt.toISOString(),
    });
    await this.recordCampaignReceipt(message, 'readAt', readAt);
    if (alsoDelivered) {
      this.events.emitMessageDelivered({
        id: message.id,
        accountId,
        deliveredAt: readAt.toISOString(),
      });
      await this.recordCampaignReceipt(message, 'deliveredAt', readAt);
    }
  }

  /**
   * Put a message back in the queue without consuming an attempt. Used when
   * the handler never actually send because the socket was unavailable. A
   * non-zero delay prevents an immediate re-claim spin while the account is
   * still marked connected in the DB but has no live socket.
   */
  async release(messageId: string, delayMs = 0, now = new Date()): Promise<void> {
    await this.prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        status: WhatsAppMessageStatus.PENDING,
        processingStartedAt: null,
        scheduledAt: new Date(now.getTime() + delayMs),
      },
    });
  }

  /**
   * Register a real delivery failure. Consumes one attempt; if exhausted the
   * message is marked FAILED, otherwise it is rescheduled with escalating
   * delay so the account can come back before the message is given up.
   */
  async failOrRetry(messageId: string, lastError: string): Promise<void> {
    const message = await this.prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        attempts: { increment: 1 },
        lastError: lastError.slice(0, 500),
      },
    });

    const failed = message.attempts >= message.maxAttempts;
    if (!failed) {
      const delayIndex = Math.min(
        Math.max(message.attempts - 1, 0),
        this.retryDelaysMs.length - 1,
      );
      const delay = this.retryDelaysMs[delayIndex];

      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          status: WhatsAppMessageStatus.PENDING,
          processingStartedAt: null,
          scheduledAt: new Date(Date.now() + delay),
        },
      });
      return;
    }

    const failedAt = new Date();
    await this.prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: { status: WhatsAppMessageStatus.FAILED, failedAt },
    });
    this.events.emitMessageFailed({
      id: message.id,
      accountId: message.accountId,
      failedAt: failedAt.toISOString(),
      lastError: message.lastError ?? undefined,
    });
    await this.recordCampaignTerminal(message, 'FAILED');
  }

  /**
   * Workspace-wide sending limit. Once the monthly SENT count is at or above
   * the configured quota, no further message may be delivered.
   */
  async isQuotaExceeded(): Promise<boolean> {
    const quota = await this.prisma.workspaceSettings.findUnique({ where: { id: 1 } });
    if (!quota) {
      return false;
    }
    const sent = await this.prisma.whatsAppMessage.count({
      where: { status: WhatsAppMessageStatus.SENT },
    });
    return sent >= quota.messageQuota;
  }

  /**
   * Permanently mark a message as FAILED because it would exceed the monthly
   * quota. Quota blocking is never retried — a fresh send is only possible
   * after the quota is raised (or a new billing period resets the count).
   */
  async markQuotaExceeded(messageId: string): Promise<void> {
    const message = await this.prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        status: WhatsAppMessageStatus.FAILED,
        attempts: { increment: 1 },
        lastError:
          'Message quota reached. Increase the monthly quota in Settings to send more.',
        failedAt: new Date(),
      },
    });
    this.events.emitMessageFailed({
      id: message.id,
      accountId: message.accountId,
      failedAt: message.failedAt!.toISOString(),
      lastError: message.lastError ?? undefined,
    });
    await this.recordCampaignTerminal(message, 'FAILED');
  }

  /**
   * Crash recovery: PROCESSING rows older than the processing timeout were
   * claimed by a worker that died before finishing. Increment the attempt so
   * the retry budget is respected, then put them back as immediately-due
   * PENDING so the fresh worker re-claims and redelivers.
   */
  async recoverStaleProcessing(cutoff: Date): Promise<number> {
    const result = await this.prisma.whatsAppMessage.updateMany({
      where: {
        status: WhatsAppMessageStatus.PROCESSING,
        processingStartedAt: { lt: cutoff },
      },
      data: {
        status: WhatsAppMessageStatus.PENDING,
        attempts: { increment: 1 },
        processingStartedAt: null,
        scheduledAt: new Date(),
        lastError: 'processing_timeout',
      },
    });
    return result.count;
  }

  /**
   * Resolve the attachment metadata attached to a campaign at send time. The
   * media file lives on disk under the backend working directory; the returned
   * absolute path is meant for WhatsAppManager to read and deliver.
   */
  async getCampaignMedia(campaignId: number): Promise<CampaignMediaSend | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        mediaPath: true,
        mediaType: true,
        mediaName: true,
        mediaMimetype: true,
      },
    });

    if (!campaign || !campaign.mediaPath || !campaign.mediaType) {
      return null;
    }

    return {
      filePath: path.resolve(process.cwd(), campaign.mediaPath),
      type: campaign.mediaType,
      name: campaign.mediaName,
      mimetype: campaign.mediaMimetype,
    };
  }

  /**
   * Mirror a delivery/read receipt timestamp onto the campaign recipient row
   * linked to a queued message so campaign stats (delivered/read) can be
   * derived without another join. No-op for direct (non-campaign) sends.
   */
  private async recordCampaignReceipt(
    message: WhatsAppMessage,
    field: 'deliveredAt' | 'readAt',
    at: Date,
  ): Promise<void> {
    if (message.campaignId == null) {
      return;
    }

    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { messageId: message.id },
      select: { id: true },
    });

    if (recipient) {
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { [field]: at },
      });
    }
  }

  private async recordCampaignTerminal(
    message: WhatsAppMessage,
    status: 'SENT' | 'FAILED',
  ): Promise<void> {
    if (message.campaignId == null) {
      return;
    }

    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { messageId: message.id },
      select: { id: true },
    });

    const terminalStatus =
      status === 'SENT' ? CampaignRecipientStatus.SENT : CampaignRecipientStatus.FAILED;
    const now = new Date();

    if (recipient) {
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: terminalStatus,
          sentAt: status === 'SENT' ? now : undefined,
          failedAt: status === 'FAILED' ? now : undefined,
        },
      });
    }

    this.events.emitMessageCampaignTerminal({
      campaignId: message.campaignId,
      messageId: message.id,
      recipientId: recipient?.id ?? null,
      status,
      lastError: status === 'FAILED' ? (message.lastError ?? undefined) : undefined,
    });
  }

  /**
   * Used by the campaign processor when a recipient is skipped (e.g. missing
   * template variable) instead of being enqueued. Marks the recipient SKIPPED.
   */
  async markCampaignSkipped(recipientId: number, reason: string): Promise<void> {
    await this.prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: CampaignRecipientStatus.SKIPPED,
        skipReason: reason,
        skippedAt: new Date(),
      },
    });
  }

  private toResource(message: WhatsAppMessage): WhatsAppMessageResource {
    return {
      id: message.id,
      account_id: message.accountId,
      recipient: message.recipient,
      status: message.status,
      attempts: message.attempts,
      max_attempts: message.maxAttempts,
      last_error: message.lastError,
      wa_message_id: message.waMessageId,
      scheduled_at: formatDateTime(message.scheduledAt) ?? '',
      sent_at: formatDateTime(message.sentAt),
      delivered_at: formatDateTime(message.deliveredAt),
      read_at: formatDateTime(message.readAt),
      failed_at: formatDateTime(message.failedAt),
      created_at: formatDateTime(message.createdAt) ?? '',
    };
  }
}