import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppManager } from '../whatsapp/whatsapp.manager.js';
import { CampaignsService } from './campaigns.service.js';

/**
 * Promotes SCHEDULED campaigns to RUNNING once their scheduledAt time passes.
 *
 * Without this tick a scheduled campaign would stay SCHEDULED forever: the
 * state machine permits SCHEDULED -> RUNNING, but nothing ever triggered it.
 *
 * Campaigns whose account is offline when they become due stay SCHEDULED and
 * are retried on every tick. The tick also nudges WhatsAppManager to open the
 * account socket so an account that ended up DISCONNECTED (e.g. a bounced
 * network drop that exhausted Baileys' bounded retries) reconnects on its own
 * the moment a due campaign needs it — the message queue resumes as soon as
 * the socket reopens.
 */
@Injectable()
export class CampaignScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignScheduler.name);
  private timer?: NodeJS.Timeout;
  private warnedFor = new Map<number, boolean>();

  constructor(
    private readonly campaigns: CampaignsService,
    private readonly whatsapp: WhatsAppManager,
    config: ConfigService,
  ) {
    const intervalSec = Number(config.get<string>('CAMPAIGN_SCHEDULER_INTERVAL_SECONDS'));
    this.intervalMs = (Number.isInteger(intervalSec) && intervalSec > 0 ? intervalSec : 10) * 1000;
  }

  private readonly intervalMs: number;

  onModuleInit(): void {
    this.logger.log(`Campaign scheduler online (poll=${this.intervalMs}ms)`);
    void this.sweep();

    this.timer = setInterval(() => {
      void this.sweep();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

private async sweep(): Promise<void> {
    // Promote campaigns whose schedule has become due.
    let due: { id: number; accountId: string }[] = [];
    try {
      due = await this.campaigns.findDueScheduledCampaigns(new Date());
    } catch (error) {
      this.logger.error(
        `Scheduler sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    for (const { id, accountId } of due) {
      try {
        await this.campaigns.startNow(id);
        if (this.warnedFor.get(id)) {
          this.warnedFor.delete(id);
        }
        this.logger.log(`Scheduled campaign ${id} started`);
      } catch (error) {
        // Account offline / validation error keeps the campaign SCHEDULED so
        // the next tick retries. Log once per campaign to keep logs quiet.
        const message = error instanceof Error ? error.message : String(error);
        if (!this.warnedFor.get(id)) {
          this.warnedFor.set(id, true);
          this.logger.warn(`Scheduled campaign ${id} not started yet: ${message}`);
        }

        // The campaign needs its WhatsApp account before it can send. Reaching
        // DISCONNECTED (e.g. a network drop that exhausted Baileys' bounded
        // retries) leaves the account permanently offline because auto-restore
        // only covers CONNECTED/CONNECTING rows on boot — so nudge a socket
        // open now. Idempotent while the socket is already alive/mid-connect,
        // and emits a QR for the user to scan if the stored session is gone.
        try {
          await this.whatsapp.connect(accountId);
        } catch (connectError) {
          this.logger.debug(
            `Reconnect nudge for account ${accountId} failed: ${
              connectError instanceof Error ? connectError.message : String(connectError)
            }`,
          );
        }
      }
    }

    // Reconcile RUNNING campaigns left behind before the terminal-event
    // watcher existed (or when a terminal event was lost).
    try {
      const reconciled = await this.campaigns.reconcileIdleRunningCampaigns();
      if (reconciled > 0) {
        this.logger.debug(`Reconciled ${reconciled} running campaign(s)`);
      }
    } catch (error) {
      this.logger.error(
        `Campaign reconciliation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
