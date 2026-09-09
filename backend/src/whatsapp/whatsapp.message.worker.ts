import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WhatsAppMessage } from '../generated/prisma/client.js';
import { WhatsAppEventBus } from './whatsapp.events.js';
import { WhatsAppManager } from './whatsapp.manager.js';
import { WhatsAppMessageService } from './whatsapp.message.service.js';

/**
 * How long a message waits before it is eligible again after the account
 * socket was unavailable. Long enough to avoid a claim/release spin, short
 * enough that a reconnect is picked up quickly; the recovery tick and the
 * `connected` event both advance work sooner.
 */
const RECONNECT_WAIT_MS = 5_000;

/**
 * Message pump sitting between the DB queue and the socket manager. Lives on
 * its own to keep connection/session concerns out of queue processing.
 *
 * Concurrency guardrails for a constrained VPS: at most one in-flight message
 * per account and a global cap so slow sends never pile up sockets.
 */
@Injectable()
export class WhatsAppMessageWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppMessageWorker.name);
  private readonly busyAccounts = new Set<string>();
  private readonly concurrency: number;
  private readonly processingTimeoutMs: number;
  private readonly recoveryIntervalMs: number;
  private readonly messageDelayMinMs: number;
  private readonly messageDelayMaxMs: number;
  private active = 0;
  private recoveryTimer?: NodeJS.Timeout;

  constructor(
    private readonly messages: WhatsAppMessageService,
    private readonly manager: WhatsAppManager,
    private readonly events: WhatsAppEventBus,
    config: ConfigService,
  ) {
    const concurrency = Number(config.get<string>('WHATSAPP_WORKER_CONCURRENCY'));
    this.concurrency = Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 1;

    const timeoutSec = Number(config.get<string>('WHATSAPP_PROCESSING_TIMEOUT_SECONDS'));
    this.processingTimeoutMs =
      (Number.isInteger(timeoutSec) && timeoutSec > 0 ? timeoutSec : 300) * 1000;

    const intervalSec = Number(config.get<string>('WHATSAPP_RECOVERY_INTERVAL_SECONDS'));
    this.recoveryIntervalMs =
      (Number.isInteger(intervalSec) && intervalSec > 0 ? intervalSec : 60) * 1000;

    // Pause between consecutive messages so bursts look like a (fast) human.
    // A random value in [min, max] keeps the cadence from feeling robotic.
    const delayMin = Number(config.get<string>('WHATSAPP_MESSAGE_DELAY_MIN_MS'));
    this.messageDelayMinMs = Number.isFinite(delayMin) && delayMin >= 0 ? delayMin : 1_500;
    const delayMax = Number(config.get<string>('WHATSAPP_MESSAGE_DELAY_MAX_MS'));
    this.messageDelayMaxMs =
      Number.isFinite(delayMax) && delayMax >= this.messageDelayMinMs
        ? delayMax
        : this.messageDelayMinMs + 2_500;
  }

  onModuleInit(): void {
    this.logger.log(
      `Message worker online (concurrency=${this.concurrency}, recovery=${this.recoveryIntervalMs}ms, processingTimeout=${this.processingTimeoutMs}ms, messageDelay=${this.messageDelayMinMs}-${this.messageDelayMaxMs}ms)`,
    );
    this.events.onMessageQueued(() => {
      void this.kick();
    });
    this.events.onConnected(() => {
      void this.kick();
    });

    this.recoveryTimer = setInterval(() => {
      void this.recoverStuckMessages();
    }, this.recoveryIntervalMs);
    this.recoveryTimer.unref?.();

    void this.kick();
  }

  onModuleDestroy(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }
  }

  /**
   * Start pumping when capacity allows. Guarded by `active` so concurrent
   * triggers (enqueue event, connect event, recovery tick, finalizers) never
   * spawn parallel drain loops.
   */
  private async kick(): Promise<void> {
    if (this.active >= this.concurrency) {
      return;
    }

    while (this.active < this.concurrency) {
      const message = await this.takeNext();
      if (!message) {
        break;
      }

      this.busyAccounts.add(message.accountId);
      this.active += 1;

      void this.process(message).finally(() => {
        this.busyAccounts.delete(message.accountId);
        this.active -= 1;
        void this.kick();
      });
    }
  }

  /**
   * Pick the oldest due message for an account that is not already being
   * processed. Claims are atomic per row, so two instances cannot both win.
   */
  private async takeNext(): Promise<WhatsAppMessage | null> {
    const candidates = await this.messages.findClaimCandidates(this.concurrency * 5);

    for (const candidate of candidates) {
      if (this.busyAccounts.has(candidate.accountId)) {
        continue;
      }
      if (await this.messages.claim(candidate.id)) {
        return candidate;
      }
    }

    return null;
  }

  private async process(message: WhatsAppMessage): Promise<void> {
    const { id, accountId, recipient, content, campaignId } = message;

    try {
      this.logger.log(`Sending message ${id} via account ${accountId}`);

      if (await this.messages.isQuotaExceeded()) {
        await this.messages.markQuotaExceeded(id);
        this.logger.warn(`Message ${id} not sent: monthly message quota reached`);
        void this.kick();
        return;
      }

      // Campaign attachments ride along with the rendered text so each
      // recipient receives the same media file.
      const media =
        campaignId != null ? await this.messages.getCampaignMedia(campaignId) : undefined;
      const { waMessageId } = await this.manager.sendMessage(
        accountId,
        recipient,
        content,
        media ?? undefined,
      );
      await this.messages.markSent(id, new Date(), waMessageId);
      await this.pauseBetweenMessages();
      this.logger.log(`Message ${id} sent to ${recipient}`);
    } catch (error) {
      const message_ = error instanceof Error ? error.message : String(error);

      if (message_ === 'NOT_CONNECTED') {
        this.logger.log(`Message ${id} requeued (account ${accountId} not connected)`);
        await this.messages.release(id, RECONNECT_WAIT_MS);
        void this.kick();
        return;
      }

      this.logger.warn(`Message ${id} failed: ${message_}`);
      await this.messages.failOrRetry(id, message_);
      void this.kick();
    }
  }

  /**
   * Random pause between two consecutive sends (happy path only). The worker
   * slot stays blocked, so the next message for this account is not picked up
   * until the pause elapses — that is what spaces the campaign out.
   */
  private async pauseBetweenMessages(): Promise<void> {
    if (this.messageDelayMaxMs <= 0) {
      return;
    }
    const delay =
      this.messageDelayMaxMs <= this.messageDelayMinMs
        ? this.messageDelayMinMs
        : this.messageDelayMinMs +
          Math.floor(Math.random() * (this.messageDelayMaxMs - this.messageDelayMinMs));
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, delay);
      timer.unref?.();
    });
  }

  private async recoverStuckMessages(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - this.processingTimeoutMs);
      const recovered = await this.messages.recoverStaleProcessing(cutoff);
      if (recovered > 0) {
        this.logger.warn(`Recovered ${recovered} stale PROCESSING message(s)`);
      }
      await this.kick();
    } catch (error) {
      this.logger.warn(`Recovery scan failed: ${String(error)}`);
    }
  }
}
