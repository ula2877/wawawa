import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  type Prisma,
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../generated/prisma/client.js';
import { buildPaginationEnvelope, formatDateTime } from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsAppEventBus } from '../whatsapp/whatsapp.events.js';
import { QueryMessagesDto } from './dto/query-messages.dto.js';

const DEFAULT_PER_PAGE = 15;
const MAX_PER_PAGE = 100;

export interface MessageResource {
  id: string;
  recipient: string;
  contact_name: string | null;
  content: string;
  status: WhatsAppMessageStatus;
  delivery_status: 'Pending' | 'Processing' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  campaign_id: number | null;
  campaign_name: string | null;
  account_id: string;
  sender_name: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string | null;
}

type MessageRow = WhatsAppMessage & {
  account: { name: string | null; phone: string | null };
  campaign: { id: number; name: string } | null;
  campaignRecipient: { contact: { name: string | null; phone: string | null } | null } | null;
};

/**
 * Read endpoint over the whatsapp_messages queue: powers the Message Queue and
 * Message Logs screens with real rows (status, attempts, timestamps) joined to
 * their account and campaign. Cancelling drops a not-yet-sent queue row;
 * retrying requeues a failed message through the normal worker path.
 */
@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: WhatsAppEventBus,
  ) {}

  async list(req: Request, params: QueryMessagesDto) {
    const perPage = this.clampPageSize(params.per_page);
    const page = this.parsePage(params.page);

    const where: Prisma.WhatsAppMessageWhereInput = {};

    const search = String(params.search ?? '').trim();
    if (search !== '') {
      where.OR = [
        { recipient: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (params.status) {
      this.applyStatusFilter(where, params.status);
    }

    const campaignId = Number(params.campaign_id);
    if (Number.isFinite(campaignId) && params.campaign_id) {
      where.campaignId = campaignId;
    }

    if (params.account_id) {
      where.accountId = params.account_id;
    }

    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(`${params.from}T00:00:00.000Z`);
      if (params.to) where.createdAt.lte = new Date(`${params.to}T23:59:59.999Z`);
    }

    const [total, items] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where }),
      this.prisma.whatsAppMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          account: { select: { name: true, phone: true } },
          campaign: { select: { id: true, name: true } },
          campaignRecipient: {
            select: { contact: { select: { name: true, phone: true } } },
          },
        },
      }),
    ]);

    return buildPaginationEnvelope(req, {
      data: items.map((m) => this.toResource(m)),
      total,
      perPage,
      page,
    });
  }

  async stats() {
    const [pending, processing, sent, failed, delivered, read] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where: { status: WhatsAppMessageStatus.PENDING } }),
      this.prisma.whatsAppMessage.count({ where: { status: WhatsAppMessageStatus.PROCESSING } }),
      this.prisma.whatsAppMessage.count({ where: { status: WhatsAppMessageStatus.SENT } }),
      this.prisma.whatsAppMessage.count({ where: { status: WhatsAppMessageStatus.FAILED } }),
      this.prisma.whatsAppMessage.count({ where: { deliveredAt: { not: null } } }),
      this.prisma.whatsAppMessage.count({ where: { readAt: { not: null } } }),
    ]);

    return {
      pending,
      processing,
      sent,
      failed,
      delivered,
      read,
      total: pending + processing + sent + failed,
    };
  }

  async cancel(id: string) {
    const result = await this.prisma.whatsAppMessage.deleteMany({
      where: { id, status: { in: [WhatsAppMessageStatus.PENDING, WhatsAppMessageStatus.PROCESSING] } },
    });

    if (result.count === 0) {
      throw new ConflictException({ message: 'Only pending or in-progress messages can be cancelled' });
    }

    return { data: { id, status: 'CANCELLED' } };
  }

  async retry(id: string) {
    const result = await this.prisma.whatsAppMessage.updateMany({
      where: { id, status: WhatsAppMessageStatus.FAILED },
      data: {
        status: WhatsAppMessageStatus.PENDING,
        attempts: 0,
        lastError: null,
        processingStartedAt: null,
        scheduledAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException({ message: 'Only failed messages can be retried' });
    }

    const message = await this.prisma.whatsAppMessage.findUnique({
      where: { id },
      select: { accountId: true },
    });

    if (message) {
      this.events.emitMessageQueued({ accountId: message.accountId });
    }

    return { data: { id, status: 'PENDING' } };
  }

  private applyStatusFilter(
    where: Prisma.WhatsAppMessageWhereInput,
    status: string,
  ): void {
    switch (status.toUpperCase()) {
      case 'PENDING':
        where.status = WhatsAppMessageStatus.PENDING;
        break;
      case 'PROCESSING':
        where.status = WhatsAppMessageStatus.PROCESSING;
        break;
      case 'SENT':
        where.status = WhatsAppMessageStatus.SENT;
        break;
      case 'FAILED':
        where.status = WhatsAppMessageStatus.FAILED;
        break;
      case 'DELIVERED':
        where.deliveredAt = { not: null };
        break;
      case 'READ':
        where.readAt = { not: null };
        break;
      default:
        break;
    }
  }

  private toResource(message: MessageRow): MessageResource {
    const deliveryStatus =
      message.readAt != null
        ? 'Read'
        : message.deliveredAt != null
          ? 'Delivered'
          : this.baseStatusLabel(message.status);

    return {
      id: message.id,
      recipient: message.recipient,
      contact_name: message.campaignRecipient?.contact?.name ?? null,
      content: message.content,
      status: message.status,
      delivery_status: deliveryStatus,
      attempts: message.attempts,
      max_attempts: message.maxAttempts,
      last_error: message.lastError,
      campaign_id: message.campaignId,
      campaign_name: message.campaign?.name ?? null,
      account_id: message.accountId,
      sender_name: message.account?.name ?? null,
      scheduled_at: formatDateTime(message.scheduledAt),
      sent_at: formatDateTime(message.sentAt),
      delivered_at: formatDateTime(message.deliveredAt),
      read_at: formatDateTime(message.readAt),
      failed_at: formatDateTime(message.failedAt),
      created_at: formatDateTime(message.createdAt),
    };
  }

  private baseStatusLabel(status: WhatsAppMessageStatus): MessageResource['delivery_status'] {
    switch (status) {
      case WhatsAppMessageStatus.PENDING:
        return 'Pending';
      case WhatsAppMessageStatus.PROCESSING:
        return 'Processing';
      case WhatsAppMessageStatus.SENT:
        return 'Sent';
      case WhatsAppMessageStatus.FAILED:
        return 'Failed';
    }
  }

  private clampPageSize(raw?: string): number {
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) return DEFAULT_PER_PAGE;
    return Math.min(value, MAX_PER_PAGE);
  }

  private parsePage(raw?: string): number {
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : 1;
  }
}