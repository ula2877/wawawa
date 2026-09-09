import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CampaignStatus,
  CampaignRecipientStatus,
  WhatsAppMessageStatus,
  type Prisma,
} from '../generated/prisma/client.js';
import {
  buildPaginationEnvelope,
  formatDateTime,
} from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsAppEventBus } from '../whatsapp/whatsapp.events.js';
import { CampaignProcessor } from './campaigns.processor.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { QueryCampaignRecipientsDto } from './dto/query-campaign-recipients.dto.js';
import { QueryCampaignsDto } from './dto/query-campaigns.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [CampaignStatus.SCHEDULED, CampaignStatus.RUNNING, CampaignStatus.CANCELLED],
  [CampaignStatus.SCHEDULED]: [CampaignStatus.RUNNING, CampaignStatus.CANCELLED],
  [CampaignStatus.RUNNING]: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.FAILED],
  [CampaignStatus.PAUSED]: [CampaignStatus.RUNNING, CampaignStatus.CANCELLED],
  [CampaignStatus.COMPLETED]: [],
  [CampaignStatus.CANCELLED]: [],
  [CampaignStatus.FAILED]: [],
};

const SORTABLE_FIELDS = ['name', 'status', 'created_at', 'started_at', 'scheduled_at'];
const DEFAULT_PER_PAGE = 15;
const MAX_PER_PAGE = 100;

interface CampaignRecipientRow {
  id: number;
  phone: string;
  status: CampaignRecipientStatus;
}

interface CampaignTargetSnapshot {
  contact_ids: number[];
  group_ids: { id: number; name: string }[];
}

export interface RecipientStats {
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  skipped: number;
}

const EMPTY_STATS: RecipientStats = {
  pending: 0,
  queued: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Prisma client usable both inside and outside a transaction so resolution
 * helpers can run against either the service client or an interactive tx.
 */
type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Strip non-digit characters from a phone string for dedup comparison.
 * Returns null when the result is empty (invalid phone).
 */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * Campaign lifecycle + CRUD. All writes go through a $transaction so the
 * campaign row, target config, and recipient snapshots are always consistent.
 */
@Injectable()
export class CampaignsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: CampaignProcessor,
    private readonly events: WhatsAppEventBus,
  ) {}

  onModuleInit(): void {
    this.events.onMessageCampaignTerminal((payload) => {
      if (payload.campaignId != null) {
        void this.checkAndCompleteIfDone(payload.campaignId);
      }
    });
  }

  // ─── CREATE ──────────────────────────────────────────────────────────

  async create(dto: CreateCampaignDto) {
    await this.assertAccountExists(dto.whatsapp_account_id);

    const template = dto.template_id != null
      ? await this.getTemplateOrThrow(dto.template_id)
      : null;

    const contactIds = [...new Set(dto.contact_ids ?? [])];
    const groupIds = [...new Set(dto.group_ids ?? [])];

    if (contactIds.length === 0 && groupIds.length === 0) {
      throw new UnprocessableEntityException({
        message: 'At least one contact or group is required.',
        errors: { contact_ids: ['At least one contact or group is required.'] },
      });
    }

    const groupTargets = await this.resolveGroupTargets(groupIds, this.prisma);
    const resolvedContactIds = await this.resolveAllContactIds(contactIds, groupIds, this.prisma);
    const contacts = await this.loadContacts(resolvedContactIds, this.prisma);

    if (contacts.length === 0) {
      throw new UnprocessableEntityException({
        message: 'No valid contacts found for the selected targets.',
        errors: { contact_ids: ['No valid contacts found for the selected targets.'] },
      });
    }

    const content = dto.content ?? template?.content ?? '';
    const variables = this.unionVariables(
      template != null ? this.parseVariables(template.variables) : [],
      this.extractContentVariables(content),
    );
    const recipients = this.buildRecipients(contacts, variables);

    const scheduledAt = dto.scheduled_at != null ? new Date(dto.scheduled_at) : null;

    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          status: CampaignStatus.DRAFT,
          whatsappAccountId: dto.whatsapp_account_id,
          templateId: template?.id ?? null,
          templateContentSnapshot: dto.content ?? template?.content ?? '',
          scheduledAt,
          recipientsCount: recipients.length,
          mediaPath: dto.media_path ?? null,
          mediaType: dto.media_type ?? null,
          mediaName: dto.media_name ?? null,
          mediaMimetype: dto.media_mimetype ?? null,
          mediaSize: dto.media_size ?? null,
        },
      });

      await tx.campaignTargets.create({
        data: {
          campaignId: created.id,
          contacts: {
            create: contactIds.map((cid) => ({ contactId: cid })),
          },
          groups: {
            create: groupTargets.map((g) => ({
              groupId: g.id,
              groupName: g.name,
            })),
          },
        },
      });

      await tx.campaignRecipient.createMany({
        data: recipients.map((r) => ({
          campaignId: created.id,
          contactId: r.contactId,
          phone: r.phone,
          variablesSnapshot: JSON.stringify(r.variables),
          status: CampaignRecipientStatus.PENDING,
        })),
      });

      return tx.campaign.findUniqueOrThrow({ where: { id: created.id } });
    });

    return { data: this.toResource(campaign) };
  }

  // ─── LIST ────────────────────────────────────────────────────────────

  async list(req: Request, params: QueryCampaignsDto) {
    const where = this.buildWhere(params);
    const orderBy = this.buildOrderBy(params);
    const perPage = this.parsePerPage(params);
    const page = this.parsePage(params);

    const [total, items] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          template: { select: { id: true, name: true, category: true } },
          whatsappAccount: { select: { id: true, name: true, phone: true, status: true } },
        },
      }),
    ]);

    const stats = await this.getRecipientStats(items.map((c) => c.id));
    const data = items.map((c) => this.toListItem(c, stats.get(c.id) ?? EMPTY_STATS));

    return buildPaginationEnvelope(req, { data, total, perPage, page });
  }

  // ─── SHOW ────────────────────────────────────────────────────────────

  async findOne(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        targets: {
          include: {
            contacts: true,
            groups: true,
          },
        },
        template: { select: { id: true, name: true, category: true } },
        whatsappAccount: { select: { id: true, name: true, phone: true, status: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const recipientStats = await this.getProgress(campaignId);

    return {
      data: {
        ...this.toListItem(campaign, recipientStats),
        targets: campaign.targets
          ? {
              contact_ids: campaign.targets.contacts.map((c) => c.contactId),
              groups: campaign.targets.groups.map((g) => ({
                id: g.groupId,
                name: g.groupName,
              })),
            }
          : null,
      },
    };
  }

  async getSentOverTime(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const rows = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      select: { sentAt: true, deliveredAt: true, readAt: true },
    });

    const byHour = new Map<number, { sent: number; delivered: number; read: number }>();
    let firstEvent = Number.POSITIVE_INFINITY;
    let lastEvent = Number.NEGATIVE_INFINITY;

    const stamp = (at: Date | null, key: 'sent' | 'delivered' | 'read'): void => {
      if (!at) return;
      const millis = at.getTime();
      if (millis < firstEvent) firstEvent = millis;
      if (millis > lastEvent) lastEvent = millis;
      const hour = millis - (at.getUTCMinutes() * 60 + at.getUTCSeconds()) * 1000 - at.getUTCMilliseconds();
      const counts = byHour.get(hour) ?? { sent: 0, delivered: 0, read: 0 };
      counts[key] += 1;
      byHour.set(hour, counts);
    };

    for (const row of rows) {
      stamp(row.sentAt, 'sent');
      stamp(row.deliveredAt, 'delivered');
      stamp(row.readAt, 'read');
    }

    if (!Number.isFinite(firstEvent)) {
      return { data: [] };
    }

    const data: { bucket: string; sent: number; delivered: number; read: number }[] = [];
    for (let hour = firstEvent - (firstEvent % 3_600_000); hour <= lastEvent - (lastEvent % 3_600_000); hour += 3_600_000) {
      const counts = byHour.get(hour) ?? { sent: 0, delivered: 0, read: 0 };
      data.push({
        bucket: new Date(hour)
          .toISOString()
          .replace(/T(\d{2}):.*/, 'T$1:00:00.000Z'),
        ...counts,
      });
    }

    return { data };
  }

  // ─── RECIPIENTS (paginated; never returned inside campaign detail) ───

  async listRecipients(req: Request, id: number | string, params: QueryCampaignRecipientsDto) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const perPage = this.parseRecipientPerPage(params.per_page);
    const page = this.parsePage(params);

    const [total, items] = await Promise.all([
      this.prisma.campaignRecipient.count({ where: { campaignId } }),
      this.prisma.campaignRecipient.findMany({
        where: { campaignId },
        orderBy: { id: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    const data = items.map((r) => this.toRecipientResource(r));

    return buildPaginationEnvelope(req, { data, total, perPage, page });
  }

  // ─── UPDATE (DRAFT only) ─────────────────────────────────────────────

  async update(id: number | string, dto: UpdateCampaignDto) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException({
        message: 'Only draft campaigns can be edited.',
      });
    }

    const targetsChanged = dto.contact_ids !== undefined || dto.group_ids !== undefined;
    const nextContactIds = targetsChanged ? [...new Set(dto.contact_ids ?? [])] : [];
    const nextGroupIds = targetsChanged ? [...new Set(dto.group_ids ?? [])] : [];

    if (targetsChanged && nextContactIds.length === 0 && nextGroupIds.length === 0) {
      throw new UnprocessableEntityException({
        message: 'At least one contact or group is required.',
        errors: { contact_ids: ['At least one contact or group is required.'] },
      });
    }

    const template = campaign.templateId != null
      ? await this.prisma.template.findUnique({ where: { id: campaign.templateId } })
      : null;
    const templateVariables = template != null ? this.parseVariables(template.variables) : [];

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.CampaignUpdateInput = {};
      if (dto.name !== undefined) {
        data.name = dto.name;
      }
      if (dto.description !== undefined) {
        data.description = dto.description;
      }
      if (dto.scheduled_at !== undefined) {
        data.scheduledAt = dto.scheduled_at != null ? new Date(dto.scheduled_at) : null;
      }
      if (dto.content !== undefined) {
        data.templateContentSnapshot = dto.content ?? '';
      }

      if (dto.media_path !== undefined) {
        if (dto.media_path === null) {
          data.mediaPath = null;
          data.mediaType = null;
          data.mediaName = null;
          data.mediaMimetype = null;
          data.mediaSize = null;
        } else {
          data.mediaPath = dto.media_path;
          data.mediaType = dto.media_type ?? null;
          data.mediaName = dto.media_name ?? null;
          data.mediaMimetype = dto.media_mimetype ?? null;
          data.mediaSize = dto.media_size ?? null;
        }
      }

      if (targetsChanged) {
        const groupTargets = await this.resolveGroupTargets(nextGroupIds, tx);
        const resolvedContactIds = await this.resolveAllContactIds(nextContactIds, nextGroupIds, tx);
        const contacts = await this.loadContacts(resolvedContactIds, tx);

        if (contacts.length === 0) {
          throw new UnprocessableEntityException({
            message: 'No valid contacts found for the selected targets.',
            errors: { contact_ids: ['No valid contacts found for the selected targets.'] },
          });
        }

        const recipients = this.buildRecipients(
          contacts,
          this.unionVariables(
            templateVariables,
            this.extractContentVariables(dto.content ?? ''),
          ),
        );
        data.recipientsCount = recipients.length;

        await tx.campaignTargets.deleteMany({ where: { campaignId } });
        await tx.campaignTargets.create({
          data: {
            campaignId,
            contacts: {
              create: nextContactIds.map((cid) => ({ contactId: cid })),
            },
            groups: {
              create: groupTargets.map((g) => ({
                groupId: g.id,
                groupName: g.name,
              })),
            },
          },
        });

        await tx.campaignRecipient.deleteMany({ where: { campaignId } });
        await tx.campaignRecipient.createMany({
          data: recipients.map((r) => ({
            campaignId,
            contactId: r.contactId,
            phone: r.phone,
            variablesSnapshot: JSON.stringify(r.variables),
            status: CampaignRecipientStatus.PENDING,
          })),
        });
      }

      if (Object.keys(data).length > 0) {
        await tx.campaign.update({ where: { id: campaignId }, data });
      }
    });

    return this.findOne(campaignId);
  }

  // ─── DELETE (DRAFT or CANCELLED only) ────────────────────────────────

  async destroy(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.CANCELLED) {
      throw new ConflictException({
        message: 'Only draft or cancelled campaigns can be deleted.',
      });
    }

    await this.prisma.campaign.delete({ where: { id: campaignId } });

    return { message: 'Campaign deleted successfully' };
  }

  // ─── TRANSITIONS ─────────────────────────────────────────────────────

  async schedule(id: number | string, scheduledAt: Date) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);
    this.assertTransition(campaign.status, CampaignStatus.SCHEDULED);

    if (scheduledAt <= new Date()) {
      throw new BadRequestException({ message: 'Scheduled time must be in the future.' });
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SCHEDULED, scheduledAt },
    });

    return this.findOne(campaignId);
  }

  /**
   * Send Now: validate the account is real and CONNECTED, move the campaign to
   * RUNNING (state machine only), then hand one batch of PENDING recipients to
   * CampaignProcessor for DB-queue enqueueing. This method never touches
   * Baileys directly.
   */
  async startNow(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);
    this.assertTransition(campaign.status, CampaignStatus.RUNNING);

    await this.assertAccountReadyToSend(campaign.whatsappAccountId);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    });

    await this.processor.processCampaign(campaignId);

    return this.findOne(campaignId);
  }

  async pause(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);
    this.assertTransition(campaign.status, CampaignStatus.PAUSED);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED, pausedAt: new Date() },
    });

    return this.findOne(campaignId);
  }

  /**
   * Resume processing: back to RUNNING (state machine only), then let
   * CampaignProcessor continue with any still-PENDING recipients. Queued
   * messages the worker already claimed become claimable again automatically
   * once the campaign is RUNNING; nothing is re-snapshotted or duplicated.
   */
  async resume(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);
    this.assertTransition(campaign.status, CampaignStatus.RUNNING);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING, pausedAt: null },
    });

    await this.processor.processCampaign(campaignId);

    return this.findOne(campaignId);
  }

  async cancel(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.requireCampaign(campaignId);
    this.assertTransition(campaign.status, CampaignStatus.CANCELLED);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.CANCELLED, cancelledAt: new Date() },
    });

    return this.findOne(campaignId);
  }

  async markCompleted(id: number) {
    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async markFailed(id: number) {
    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.FAILED },
    });
  }

  async duplicate(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const source = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        targets: {
          include: { contacts: true, groups: true },
        },
        recipients: true,
      },
    });

    if (!source) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          name: `${source.name} (copy)`,
          description: source.description,
          status: CampaignStatus.DRAFT,
          whatsappAccountId: source.whatsappAccountId,
          templateId: source.templateId,
          templateContentSnapshot: source.templateContentSnapshot,
          recipientsCount: source.recipientsCount,
          mediaPath: source.mediaPath,
          mediaType: source.mediaType,
          mediaName: source.mediaName,
          mediaMimetype: source.mediaMimetype,
          mediaSize: source.mediaSize,
        },
      });

      if (source.targets) {
        await tx.campaignTargets.create({
          data: {
            campaignId: created.id,
            contacts: {
              create: source.targets.contacts.map((c) => ({ contactId: c.contactId })),
            },
            groups: {
              create: source.targets.groups.map((g) => ({
                groupId: g.groupId,
                groupName: g.groupName,
              })),
            },
          },
        });

        await tx.campaignRecipient.createMany({
          data: source.recipients.map((r) => ({
            campaignId: created.id,
            contactId: r.contactId,
            phone: r.phone,
            variablesSnapshot: r.variablesSnapshot,
            status: CampaignRecipientStatus.PENDING,
          })),
        });
      }

      return tx.campaign.findUniqueOrThrow({ where: { id: created.id } });
    });

    return { data: this.toResource(campaign) };
  }

  // ─── PROGRESS ────────────────────────────────────────────────────────

  async getProgress(id: number): Promise<RecipientStats> {
    const rows = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: { status: true },
    });

    const progress: RecipientStats = { ...EMPTY_STATS };

    for (const row of rows) {
      progress[row.status.toLowerCase() as keyof RecipientStats] = row._count.status;
    }

    const [delivered, read] = await Promise.all([
      this.prisma.campaignRecipient.count({
        where: { campaignId: id, deliveredAt: { not: null } },
      }),
      this.prisma.campaignRecipient.count({
        where: { campaignId: id, readAt: { not: null } },
      }),
    ]);
    progress.delivered = delivered;
    progress.read = read;

    return progress;
  }

  /**
   * Batch version of getProgress for many campaign ids (one GROUP BY query).
   */
  private async getRecipientStats(campaignIds: number[]): Promise<Map<number, RecipientStats>> {
    const stats = new Map<number, RecipientStats>();

    if (campaignIds.length === 0) {
      return stats;
    }

    const rows = await this.prisma.campaignRecipient.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: campaignIds } },
      _count: { status: true },
    });

    for (const row of rows) {
      let entry = stats.get(row.campaignId);
      if (!entry) {
        entry = { ...EMPTY_STATS };
        stats.set(row.campaignId, entry);
      }
      entry[row.status.toLowerCase() as keyof RecipientStats] = row._count.status;
    }

    const countDelivered = async (field: 'deliveredAt' | 'readAt') => {
      const grouped = await this.prisma.campaignRecipient.groupBy({
        by: ['campaignId'],
        where: { campaignId: { in: campaignIds }, [field]: { not: null } },
        _count: { _all: true },
      });
      for (const row of grouped) {
        const entry = stats.get(row.campaignId);
        if (entry) {
          entry[field === 'deliveredAt' ? 'delivered' : 'read'] = row._count._all;
        }
      }
    };

    await Promise.all([countDelivered('deliveredAt'), countDelivered('readAt')]);

    return stats;
  }

  // ─── CHECK COMPLETION (called by worker after each message terminal) ──

  async checkAndCompleteIfDone(id: number): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
      return;
    }

    const total = campaign.recipientsCount;
    if (total === 0) return;

    const completed = await this.prisma.campaignRecipient.count({
      where: {
        campaignId: id,
        status: { in: [CampaignRecipientStatus.SENT, CampaignRecipientStatus.FAILED, CampaignRecipientStatus.SKIPPED] },
      },
    });

    if (completed >= total) {
      await this.markCompleted(id);
    }
  }

  // ─── FIND RUNNING PAUSABLE (for scheduler) ───────────────────────────

  async findDueScheduledCampaigns(now: Date): Promise<{ id: number; accountId: string }[]> {
    const rows = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      select: { id: true, whatsappAccountId: true },
    });
    return rows.map((r) => ({ id: r.id, accountId: r.whatsappAccountId }));
  }

  /**
   * Clean up campaigns that reached a terminal recipient state after every
   * recipient completed but before the completion watcher existed (or whose
   * terminal-event tick was lost). Cheap when nothing is finished.
   */
  async reconcileIdleRunningCampaigns(limit = 100): Promise<number> {
    const ids = await this.prisma.campaign.findMany({
      where: { status: CampaignStatus.RUNNING },
      select: { id: true },
      take: limit,
    });

    for (const { id } of ids) {
      await this.checkAndCompleteIfDone(id);
    }

    return ids.length;
  }

  // ─── INTERNAL HELPERS ────────────────────────────────────────────────

  private assertTransition(from: CampaignStatus, to: CampaignStatus) {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new ConflictException({
        message: `Cannot transition campaign from ${from} to ${to}.`,
      });
    }
  }

  private async requireCampaign(id: number | string) {
    const campaignId = this.parseId(id);

    if (campaignId === null) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException({ message: 'Not Found' });
    }
    return campaign;
  }

  private async assertAccountExists(accountId: string) {
    const account = await this.prisma.whatsAppAccount.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    if (!account) {
      throw new UnprocessableEntityException({
        message: 'The selected whatsapp account id is invalid.',
        errors: { whatsapp_account_id: ['The selected whatsapp account id is invalid.'] },
      });
    }
  }

  /**
   * Pre-RUNNING guard for Send Now: the account must exist and be CONNECTED.
   * Mirrors the message worker's own gate (only CONNECTED accounts are
   * claimable), so a campaign never enters RUNNING against a dead account.
   */
  private async assertAccountReadyToSend(accountId: string) {
    const account = await this.prisma.whatsAppAccount.findUnique({
      where: { id: accountId },
      select: { id: true, status: true },
    });

    if (!account) {
      throw new UnprocessableEntityException({
        message: 'The selected whatsapp account id is invalid.',
        errors: { whatsapp_account_id: ['The selected whatsapp account id is invalid.'] },
      });
    }

    if (account.status !== 'CONNECTED') {
      throw new UnprocessableEntityException({
        message: 'The WhatsApp account must be connected to start sending.',
        errors: { whatsapp_account_id: ['The WhatsApp account must be connected before the campaign can run.'] },
      });
    }
  }

  private async getTemplateOrThrow(id: number) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new UnprocessableEntityException({
        message: 'The selected template id is invalid.',
        errors: { template_id: ['The selected template id is invalid.'] },
      });
    }
    return template;
  }

  private async resolveGroupTargets(groupIds: number[], db: DbClient) {
    if (groupIds.length === 0) return [];
    const groups = await db.group.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true },
    });
    if (groups.length !== groupIds.length) {
      const found = new Set(groups.map((g) => g.id));
      const missing = groupIds.filter((id) => !found.has(id));
      throw new UnprocessableEntityException({
        message: `The selected group ids is invalid.`,
        errors: { group_ids: [`Group ${missing.join(', ')} not found.`] },
      });
    }
    return groups;
  }

  /**
   * Resolve all contact IDs from explicit contactIds + group membership.
   * Group members are merged first, then explicit contactIds added, then
   * deduplicated. All-or-nothing: missing contacts/groups cause an error.
   */
  private async resolveAllContactIds(
    explicitContactIds: number[],
    groupIds: number[],
    db: DbClient,
  ): Promise<number[]> {
    const allIds = new Set<number>(explicitContactIds);

    if (groupIds.length > 0) {
      const pivot = await db.contactGroup.findMany({
        where: { group_id: { in: groupIds } },
        select: { contact_id: true },
      });
      for (const row of pivot) {
        allIds.add(row.contact_id);
      }
    }

    return [...allIds];
  }

  private async loadContacts(contactIds: number[], db: DbClient) {
    return db.contact.findMany({
      where: { id: { in: contactIds } },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });
  }

  private buildRecipients(
    contacts: Awaited<ReturnType<typeof this.loadContacts>>,
    templateVariables: string[],
  ) {
    const seen = new Set<string>();
    const recipients: { contactId: number; phone: string; variables: Record<string, string | number | null> }[] = [];

    for (const contact of contacts) {
      const normalized = normalizePhone(contact.phone);
      if (normalized === null || seen.has(normalized)) continue;
      seen.add(normalized);

      const variables: Record<string, string | number | null> = {};
      for (const v of templateVariables) {
        if (v === 'groups') {
          variables[v] = contact.groups
            .map((cg) => cg.group.name)
            .join(', ');
        } else {
          variables[v] = (contact as Record<string, unknown>)[v] as string | number | null;
        }
      }
      recipients.push({
        contactId: contact.id,
        phone: contact.phone,
        variables,
      });
    }

    return recipients;
  }

  private parseVariables(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch { /* corrupt → empty */ }
    return [];
  }

  /**
   * Extract `{{ variable }}` placeholders from rendered message content so
   * per-recipient snapshots stay in sync with what the processor actually
   * renders. Mirrors the extraction in the campaign processor.
   */
  private extractContentVariables(content: string): string[] {
    const regex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    return variables;
  }

  private unionVariables(a: string[], b: string[]): string[] {
    return Array.from(new Set([...a, ...b]));
  }

  private parseSnapshot(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch { /* corrupt → empty */ }
    return {};
  }

  private parseId(id: number | string): number | null {
    if (typeof id === 'number') {
      return Number.isInteger(id) && id >= 1 ? id : null;
    }

    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
  }

  private toListItem(
    campaign: {
      id: number;
      name: string;
      description: string | null;
      status: CampaignStatus;
      whatsappAccountId: string;
      templateId: number | null;
      templateContentSnapshot: string;
      mediaPath: string | null;
      mediaType: string | null;
      mediaName: string | null;
      mediaMimetype: string | null;
      mediaSize: number | null;
      scheduledAt: Date | null;
      startedAt: Date | null;
      pausedAt: Date | null;
      completedAt: Date | null;
      cancelledAt: Date | null;
      recipientsCount: number;
      createdAt: Date;
      updatedAt: Date;
      template?: { id: number; name: string; category: string } | null;
      whatsappAccount?: { id: string; name: string; phone: string | null; status: string } | null;
    },
    stats: RecipientStats,
  ) {
    return {
      ...this.toResource(campaign),
      template: campaign.template
        ? {
            id: campaign.template.id,
            name: campaign.template.name,
            category: campaign.template.category,
          }
        : null,
      whatsapp_account: campaign.whatsappAccount
        ? {
            id: campaign.whatsappAccount.id,
            name: campaign.whatsappAccount.name,
            phone: campaign.whatsappAccount.phone,
            status: campaign.whatsappAccount.status,
          }
        : null,
      recipient_stats: stats,
    };
  }

  private toRecipientResource(recipient: {
    id: number;
    campaignId: number;
    contactId: number | null;
    phone: string;
    variablesSnapshot: string;
    status: CampaignRecipientStatus;
    skipReason: string | null;
    queuedAt: Date | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    failedAt: Date | null;
    skippedAt: Date | null;
    createdAt: Date;
    contact?: { id: number; name: string; phone: string } | null;
  }) {
    return {
      id: recipient.id,
      campaign_id: recipient.campaignId,
      contact_id: recipient.contactId,
      contact: recipient.contact
        ? {
            id: recipient.contact.id,
            name: recipient.contact.name,
            phone: recipient.contact.phone,
          }
        : null,
      phone: recipient.phone,
      variables_snapshot: this.parseSnapshot(recipient.variablesSnapshot),
      status: recipient.status,
      skip_reason: recipient.skipReason,
      queued_at: formatDateTime(recipient.queuedAt),
      sent_at: formatDateTime(recipient.sentAt),
      delivered_at: formatDateTime(recipient.deliveredAt),
      read_at: formatDateTime(recipient.readAt),
      failed_at: formatDateTime(recipient.failedAt),
      skipped_at: formatDateTime(recipient.skippedAt),
      created_at: formatDateTime(recipient.createdAt),
    };
  }

  private parseRecipientPerPage(raw: string | undefined): number {
    let perPage = 25;
    if (raw != null && raw !== '') {
      const parsed = parseInt(String(raw), 10);
      perPage = Number.isNaN(parsed) ? 25 : parsed;
    }
    return Math.min(Math.max(perPage, 1), 100);
  }

  private buildWhere(params: QueryCampaignsDto): Prisma.CampaignWhereInput {
    const where: Prisma.CampaignWhereInput = {};

    const search = (params.search ?? '').toString().trim();
    if (search !== '') {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const status = (params.status ?? '').toString().trim().toUpperCase();
    if (status && Object.values(CampaignStatus).includes(status as CampaignStatus)) {
      where.status = status as CampaignStatus;
    }

    return where;
  }

  private buildOrderBy(params: QueryCampaignsDto): Prisma.CampaignOrderByWithRelationInput {
    const field = SORTABLE_FIELDS.includes(params.sort_by ?? '')
      ? params.sort_by!
      : 'created_at';

    const direction =
      String(params.sort_direction ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const mapped: Record<string, string> = {
      created_at: 'createdAt',
      started_at: 'startedAt',
      scheduled_at: 'scheduledAt',
    };

    return { [mapped[field] ?? field]: direction } as Prisma.CampaignOrderByWithRelationInput;
  }

  private parsePerPage(params: QueryCampaignsDto): number {
    let perPage = DEFAULT_PER_PAGE;
    if (params.per_page != null && params.per_page !== '') {
      const parsed = parseInt(String(params.per_page), 10);
      perPage = Number.isNaN(parsed) ? DEFAULT_PER_PAGE : parsed;
    }
    return Math.min(Math.max(perPage, 1), MAX_PER_PAGE);
  }

  private parsePage(params: QueryCampaignsDto): number {
    if (params.page == null || params.page === '') return 1;
    const parsed = parseInt(String(params.page), 10);
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }

  private toResource(campaign: {
    id: number;
    name: string;
    description: string | null;
    status: CampaignStatus;
    whatsappAccountId: string;
    templateId: number | null;
    templateContentSnapshot: string;
    mediaPath: string | null;
    mediaType: string | null;
    mediaName: string | null;
    mediaMimetype: string | null;
    mediaSize: number | null;
    scheduledAt: Date | null;
    startedAt: Date | null;
    pausedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    recipientsCount: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      whatsapp_account_id: campaign.whatsappAccountId,
      template_id: campaign.templateId,
      template_content_snapshot: campaign.templateContentSnapshot,
      media_path: campaign.mediaPath,
      media_type: campaign.mediaType,
      media_name: campaign.mediaName,
      media_mimetype: campaign.mediaMimetype,
      media_size: campaign.mediaSize,
      scheduled_at: formatDateTime(campaign.scheduledAt),
      started_at: formatDateTime(campaign.startedAt),
      paused_at: formatDateTime(campaign.pausedAt),
      completed_at: formatDateTime(campaign.completedAt),
      cancelled_at: formatDateTime(campaign.cancelledAt),
      recipients_count: campaign.recipientsCount,
      created_at: formatDateTime(campaign.createdAt),
      updated_at: formatDateTime(campaign.updatedAt),
    };
  }
}
