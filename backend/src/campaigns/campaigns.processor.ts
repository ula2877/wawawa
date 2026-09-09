import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CampaignRecipientStatus,
  CampaignStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsAppMessageService } from '../whatsapp/whatsapp.message.service.js';

const MISSING_TEMPLATE_VARIABLE = 'MISSING_TEMPLATE_VARIABLE';

interface RecipientForRender {
  id: number;
  phone: string;
  variablesSnapshot: string | null;
}

interface RenderResult {
  enqueue: {
    recipientId: number;
    phone: string;
    content: string;
  }[];
  skipped: number[];
}

/**
 * Turns a RUNNING campaign's recipient snapshot into real queue entries. One
 * pass grabs the oldest PENDING recipients up to the batch size, renders the
 * template content against each recipient's frozen variables, enqueues the
 * resulting messages, and reports the campaign as COMPLETED when the last
 * recipient has reached a terminal state.
 */
@Injectable()
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);
  private readonly batchSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: WhatsAppMessageService,
    config: ConfigService,
  ) {
    const configured = Number(config.get<string>('CAMPAIGN_BATCH_SIZE'));
    this.batchSize = Number.isInteger(configured) && configured > 0 ? configured : 50;
  }

  /**
   * Advance up to {@link batchSize} PENDING recipients of a campaign. Safe to
   * call repeatedly; ignores non-RUNNING/PAUSED campaigns and empty batches.
   */
  async processCampaign(campaignId: number): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });

    if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
      return;
    }

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: CampaignRecipientStatus.PENDING,
      },
      orderBy: { id: 'asc' },
      take: this.batchSize,
    });

    if (recipients.length > 0) {
      const rendered = this.renderBatch(campaign.templateContentSnapshot, recipients);

      const skippedIds = rendered.skipped;
      if (skippedIds.length > 0) {
        await this.prisma.campaignRecipient.updateMany({
          where: { id: { in: skippedIds } },
          data: {
            status: CampaignRecipientStatus.SKIPPED,
            skipReason: MISSING_TEMPLATE_VARIABLE,
            skippedAt: new Date(),
          },
        });
      }

      let enqueued = 0;
      for (const item of rendered.enqueue) {
        // Atomic claim: only succeeds if the recipient is still PENDING.
        // A concurrent processCampaign call targeting the same recipient
        // will see count === 0 and skip it, preventing duplicate messages.
        const claimed = await this.prisma.campaignRecipient.updateMany({
          where: { id: item.recipientId, status: CampaignRecipientStatus.PENDING },
          data: { status: CampaignRecipientStatus.QUEUED, queuedAt: new Date() },
        });

        if (claimed.count === 0) continue;

        await this.messages.enqueueForCampaign(
          campaign.whatsappAccountId,
          item.recipientId,
          item.phone,
          item.content,
          campaign.id,
        );
        enqueued++;
      }

      this.logger.log(
        `Campaign ${campaignId}: enqueued ${enqueued}, skipped ${skippedIds.length}`,
      );
    }

    await this.finishIfComplete(campaignId);
  }

  /**
   * Check if every recipient has reached a terminal status (SENT/FAILED/
   * SKIPPED); if so mark the campaign COMPLETED.
   */
  private async finishIfComplete(campaignId: number): Promise<void> {
    const ongoing = await this.prisma.campaignRecipient.count({
      where: {
        campaignId,
        status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
      },
    });

    if (ongoing > 0) {
      return;
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
      return;
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
    });
    this.logger.log(`Campaign ${campaignId} completed`);
  }

  /**
   * Render the snapshot template against each recipient's variables. Any
   * recipient missing a declared template variable is skipped (no message is
   * created and no retry budget is burned); extra variables are ignored.
   */
  private renderBatch(
    templateContent: string,
    recipients: RecipientForRender[],
  ): RenderResult {
    const variables = this.extractVariables(templateContent);
    const noPlaceholders = variables.length === 0;

    const enqueue: RenderResult['enqueue'] = [];
    const skipped: number[] = [];

    for (const recipient of recipients) {
      if (!noPlaceholders) {
        const snapshot = this.parseSnapshot(recipient.variablesSnapshot);

        let missing = false;
        for (const variable of variables) {
          const value = snapshot[variable];
          if (value === undefined || value === null || value === '') {
            missing = true;
            break;
          }
        }

        if (missing) {
          skipped.push(recipient.id);
          continue;
        }
      }

      let content = templateContent;
      if (!noPlaceholders) {
        const snapshot = this.parseSnapshot(recipient.variablesSnapshot);
        for (const variable of variables) {
          const value = String(snapshot[variable] ?? '');
          content = content.replace(
            new RegExp(`\\{\\{\\s*${this.escapeRegExp(variable)}\\s*\\}\\}`, 'g'),
            value,
          );
        }
      }

      enqueue.push({
        recipientId: recipient.id,
        phone: recipient.phone,
        content,
      });
    }

    return { enqueue, skipped };
  }

  private extractVariables(content: string): string[] {
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

  private parseSnapshot(raw: string | null): Record<string, unknown> {
    if (!raw) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // corrupt snapshot → treated as empty, which would be skipped
    }

    return {};
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}