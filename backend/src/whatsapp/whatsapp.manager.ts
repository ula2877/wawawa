import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  proto,
  type AnyMessageContent,
  type ConnectionState,
  type Contact,
  type WAMessageUpdate,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import QRCode from 'qrcode';
import { WhatsAppAccountStatus } from '../generated/prisma/client.js';
import type {
  ActiveWhatsAppSession,
  WhatsAppSessionSnapshot,
} from './interfaces/whatsapp-session.interface.js';
import { WhatsAppEventBus } from './whatsapp.events.js';
import { WhatsAppMessageService } from './whatsapp.message.service.js';
import { WhatsAppService } from './whatsapp.service.js';

const QR_TTL_MS = 45_000;
const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 60_000, 120_000];
const ACCOUNT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Media being delivered with a campaign message. */
export interface MediaSendPayload {
  filePath: string;
  type: string;
  name?: string | null;
  mimetype?: string | null;
}

const EXT_MIMES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mpeg: 'video/mpeg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  csv: 'text/csv',
};

function mimeFromName(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return EXT_MIMES[ext] ?? null;
}

function statusWasConnected(account: { status: WhatsAppAccountStatus }): boolean {
  return account.status === WhatsAppAccountStatus.CONNECTED;
}

/**
 * Turn a user-supplied recipient into a WhatsApp JID. Accepts a full JID
 * (e.g. `62812...@s.whatsapp.net` or a group id ending in `@g.us`) as-is, or
 * a bare phone number in common Indonesian forms (`0812...`, `+62...`,
 * `62812...`) which is normalized to the `@s.whatsapp.net` suffix.
 */
function normalizeRecipient(recipient: string): string {
  const trimmed = recipient.trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D+/g, '');
  if (digits === '') {
    throw new Error('INVALID_RECIPIENT');
  }

  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `${normalized}@s.whatsapp.net`;
}
/**
 * Minimal logger satisfying Baileys' logger contract. Baileys 7 does not
 * expose `defaultLogger` through its public entrypoint (verified against
 * 7.0.0-rc14), so we forward its log lines into Nest's Logger.
 */
class BaileysForwardLogger {
  level = 'warn';
  private readonly logger = new Logger('Baileys');

  child(): BaileysForwardLogger {
    return this;
  }

  trace(obj: unknown, msg?: string): void {
    this.logger.debug(this.pair(obj, msg));
  }

  debug(obj: unknown, msg?: string): void {
    this.logger.debug(this.pair(obj, msg));
  }

  info(obj: unknown, msg?: string): void {
    this.logger.log(this.pair(obj, msg));
  }

  warn(obj: unknown, msg?: string): void {
    this.logger.warn(this.pair(obj, msg));
  }

  error(obj: unknown, msg?: string): void {
    this.logger.error(this.pair(obj, msg));
  }

  private pair(obj: unknown, msg?: string): string {
    if (msg !== undefined) {
      return `${msg} ${typeof obj === 'object' ? JSON.stringify(obj ?? {}) : obj}`;
    }
    return typeof obj === 'string' ? obj : JSON.stringify(obj ?? {});
  }
}

/**
 * Core Baileys integration. Owns the Map<accountId, WASocket> and the full
 * socket lifecycle. The DB row (status) is the persisted source of truth and
 * every transition is written through WhatsAppService before being broadcast
 * over Socket.IO.
 */
@Injectable()
export class WhatsAppManager
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(WhatsAppManager.name);
  private readonly sessions = new Map<string, ActiveWhatsAppSession>();
  private readonly sessionRoot: string;
  private readonly restoreDelayMs: number;
  private readonly typingEnabled: boolean;
  private readonly typingMinMs: number;
  private readonly typingMaxMs: number;
  private readonly typingCharMs: number;

  constructor(
    private readonly service: WhatsAppService,
    private readonly messages: WhatsAppMessageService,
    private readonly events: WhatsAppEventBus,
    config: ConfigService,
  ) {
    const relative = config.get<string>('WHATSAPP_SESSION_DIR') ?? 'storage/whatsapp-sessions';
    this.sessionRoot = path.resolve(process.cwd(), relative);
    this.ensureSessionRoot();
    this.restoreDelayMs = this.parsePositiveInt(
      config.get<string>('WHATSAPP_RESTORE_DELAY_MS'),
      2_000,
    );

    // "Typing..." indicator sent right before each message. The duration is
    // tied to the message length so it mimics a real person (min/max bound).
    this.typingEnabled = (config.get<string>('WHATSAPP_TYPING_ENABLED') ?? '1') !== '0';
    this.typingMinMs = this.parsePositiveInt(config.get<string>('WHATSAPP_TYPING_MIN_MS'), 800);
    this.typingCharMs = this.parsePositiveInt(config.get<string>('WHATSAPP_TYPING_CHAR_MS'), 40);
    this.typingMaxMs = Math.max(
      this.parsePositiveInt(config.get<string>('WHATSAPP_TYPING_MAX_MS'), 5_000),
      this.typingMinMs,
    );
  }

  /**
   * Restore persisted sessions after the app finishes booting. Accounts are
   * restored sequentially with a configurable delay between each so we never
   * open many sockets at once (reconnect storm). A row left CONNECTED by a
   * previous process is reconciled to DISCONNECTED first; the socket is then
   * opened and will re-verify the session (possibly requiring a fresh QR if
   * the session expired). Failures are isolated per account.
   */
  async onApplicationBootstrap(): Promise<void> {
    let accounts;
    try {
      accounts = await this.service.findRestorableAccounts();
    } catch (error) {
      this.logger.warn(`Auto-restore scan failed: ${String(error)}`);
      return;
    }

    if (accounts.length === 0) {
      return;
    }

    this.logger.log(
      `Auto-restore: ${accounts.length} account(s) with persisted session to restore`,
    );

    for (const account of accounts) {
      const sessionDir = this.sessionPathFor(account.id);
      const dirExists = await this.directoryExists(sessionDir);

      if (statusWasConnected(account) && !dirExists) {
        this.logger.warn(
          `Account ${account.id} was CONNECTED but has no session files; resetting to DISCONNECTED`,
        );
        await this.service.markDisconnected(account.id).catch((error: unknown) => {
          this.logger.warn(`Failed to reset ${account.id}: ${String(error)}`);
        });
        continue;
      }

      if (!dirExists) {
        continue;
      }

      this.logger.log(`Auto-restore: opening socket for account ${account.id}`);
      try {
        await this.connect(account.id);
      } catch (error) {
        this.logger.warn(`Auto-restore failed for ${account.id}: ${String(error)}`);
      }

      if (this.restoreDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.restoreDelayMs));
      }
    }
  }

  private parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw === null || raw === '' || Number.isNaN(Number(raw))) {
      return fallback;
    }
    const value = Number(raw);
    return value >= 0 ? value : fallback;
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      await fs.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start (or resume) an account socket. Idempotent: if a live socket exists
   * the current status is returned and no second socket is created.
   */
  async connect(accountId: string): Promise<WhatsAppAccountStatus> {
    await this.service.ensureExists(accountId);

    const existing = this.sessions.get(accountId);
    const socketActive = existing?.socket !== undefined && !existing.socket.ws.isClosed;

    if (existing && !existing.aborted && (socketActive || existing.status === WhatsAppAccountStatus.CONNECTING)) {
      return existing.status;
    }

    if (existing) {
      this.clearReconnect(existing);
      this.clearQr(existing);
      existing.aborted = true;
      this.sessions.delete(accountId);
    }

    const session: ActiveWhatsAppSession = {
      accountId,
      status: WhatsAppAccountStatus.CONNECTING,
      retryCount: 0,
      aborted: false,
    };
    this.sessions.set(accountId, session);

    await this.applyStatus(session, WhatsAppAccountStatus.CONNECTING);
    await this.spawnSocket(accountId);

    return session.status;
  }

  /**
   * Graceful disconnect. Keeps the persisted session files so the next
   * `connect` silently re-authenticates without a new QR.
   */
  async disconnect(accountId: string): Promise<WhatsAppAccountStatus> {
    await this.service.ensureExists(accountId);

    const session = this.sessions.get(accountId);
    if (session) {
      this.clearReconnect(session);
      this.clearQr(session);
      session.aborted = true;
      await this.closeSocket(session);
      this.sessions.delete(accountId);
    }

    await this.applyDisconnected(accountId, 'disconnected');
    return WhatsAppAccountStatus.DISCONNECTED;
  }

  /**
   * Full logout: closes the socket, deletes the session credentials from
   * disk and marks the account LOGGED_OUT. The next connect forces a fresh
   * QR scan. Kept separate from disconnect on purpose.
   */
  async logout(accountId: string): Promise<WhatsAppAccountStatus> {
    await this.service.ensureExists(accountId);

    const session = this.sessions.get(accountId);
    if (session) {
      this.clearReconnect(session);
      this.clearQr(session);
      session.aborted = true;
      await this.closeSocket(session);
      this.sessions.delete(accountId);
    }

    await this.removeSessionFolder(accountId);
    await this.applyLoggedOut(accountId);
    return WhatsAppAccountStatus.LOGGED_OUT;
  }

  /**
   * Teardown used when an account row is deleted: closes the socket and
   * removes the session folder. DB row removal stays in WhatsAppService.
   */
  async purgeAccount(accountId: string): Promise<void> {
    if (!ACCOUNT_ID_PATTERN.test(accountId)) {
      return;
    }

    const session = this.sessions.get(accountId);
    if (session) {
      this.clearReconnect(session);
      this.clearQr(session);
      session.aborted = true;
      await this.closeSocket(session);
      this.sessions.delete(accountId);
    }

    await this.removeSessionFolder(accountId);
  }

  /**
   * In-memory snapshots replayed to freshly connected Socket.IO clients.
   */
  getSnapshots(): WhatsAppSessionSnapshot[] {
    const snapshots: WhatsAppSessionSnapshot[] = [];

    for (const session of this.sessions.values()) {
      snapshots.push({
        accountId: session.accountId,
        status: session.status,
        phone: session.phone,
        qr: this.isQrValid(session) ? session.activeQr : undefined,
      });
    }

    return snapshots;
  }

  async onModuleDestroy(): Promise<void> {
    for (const session of this.sessions.values()) {
      this.clearReconnect(session);
      this.clearQr(session);
      session.aborted = true;
      await this.closeSocket(session);
    }
    this.sessions.clear();
  }

  /**
   * Send a message through the account's live socket. Throws
   * `NOT_CONNECTED` when no usable socket exists so the queue worker can
   * decide whether the failure is a retryable connectivity problem.
   *
   * An optional `media` payload upgrades the plain text message to an
   * image/video/audio/document message (caption = the message body). The
   * file is read from disk right before delivery so a campaign re-sends the
   * exact bytes uploaded for it.
   *
   * When typing is enabled a short "typing..." indicator is shown to the
   * recipient first. Presence updates are best-effort: a failure there must
   * never block the actual delivery.
   *
   * Returns the Baileys message key id so the caller can persist it and later
   * correlate delivery/read receipts back to this message.
   */
  async sendMessage(
    accountId: string,
    recipient: string,
    content: string,
    media?: MediaSendPayload,
  ): Promise<{ waMessageId: string }> {
    const session = this.sessions.get(accountId);
    if (!session?.socket || session.status !== WhatsAppAccountStatus.CONNECTED) {
      throw new Error('NOT_CONNECTED');
    }

    const jid = normalizeRecipient(recipient);
    if (this.typingEnabled && !media) {
      await this.simulateTyping(session.socket, jid, content);
    }
    const sent = await session.socket.sendMessage(
      jid,
      await this.buildSendContent(content, media),
    );
    const waMessageId = sent?.key?.id ?? '';
    if (waMessageId === '') {
      this.logger.warn(`No message key returned for ${jid}; receipts untrackable`);
    }
    return { waMessageId };
  }

  /**
   * Apply WhatsApp delivery/read receipts to our queued messages. In Baileys
   * v7 1-on-1 conversations emit `messages.update` where `update.status`
   * advances to DELIVERY_ACK (delivered to the device) then READ. Only
   * messages we sent (`key.fromMe`) are considered; unknown keys and
   * receipts for our own identical lookup keys are ignored harmlessly.
   */
  private async handleMessageUpdates(
    accountId: string,
    updates: WAMessageUpdate[],
  ): Promise<void> {
    for (const { key, update } of updates) {
      if (!key.fromMe || key.id === '' || key.id == null) {
        continue;
      }

      if (update.status === proto.WebMessageInfo.Status.DELIVERY_ACK) {
        try {
          await this.messages.markDelivered(
            accountId,
            key.id,
            this.receiptTimestampToDate(update.messageTimestamp),
          );
        } catch (error) {
          this.logger.warn(
            `Failed to record DELIVERY_ACK for ${accountId}/${key.id}: ${String(error)}`,
          );
        }
      } else if (update.status === proto.WebMessageInfo.Status.READ) {
        try {
          await this.messages.markRead(
            accountId,
            key.id,
            this.receiptTimestampToDate(update.messageTimestamp),
          );
        } catch (error) {
          this.logger.warn(
            `Failed to record READ for ${accountId}/${key.id}: ${String(error)}`,
          );
        }
      }
    }
  }

  /**
   * Baileys encodes protobuf timestamps as epoch seconds and hands them over
   * as a number or a Long. Normalize either to a Date (falling back to now).
   */
  private receiptTimestampToDate(value: unknown): Date {
    let seconds: number;
    if (typeof value === 'number') {
      seconds = value;
    } else if (typeof value === 'bigint') {
      seconds = Number(value);
    } else if (
      value != null &&
      typeof (value as { toNumber?: unknown }).toNumber === 'function'
    ) {
      seconds = (value as { toNumber(): number }).toNumber();
    } else if (typeof value === 'string') {
      seconds = parseFloat(value);
    } else {
      seconds = Date.now() / 1000;
    }
    const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.now();
    return new Date(ms);
  }

  /**
   * Build the Baileys message payload. Text-only when there is no media;
   * otherwise reads the attachment and maps it to the matching media message
   * type so WhatsApp renders file preview, duration or document name.
   */
  private async buildSendContent(
    content: string,
    media?: MediaSendPayload,
  ): Promise<AnyMessageContent> {
    if (!media) {
      return { text: content };
    }

    const buffer = await fs.readFile(media.filePath);
    const mimetype = media.mimetype || mimeFromName(media.filePath) || undefined;

    switch (media.type) {
      case 'image':
        return { image: buffer, caption: content, mimetype };
      case 'video':
        return { video: buffer, caption: content, mimetype };
      case 'audio':
        return { audio: buffer, mimetype: mimetype || 'audio/mpeg', ptt: false };
      case 'document':
        return {
          document: buffer,
          fileName: media.name || path.basename(media.filePath),
          mimetype: mimetype || 'application/octet-stream',
          caption: content,
        };
      default:
        return { text: content };
    }
  }

  /**
   * Show the recipient a "typing..." bubble for roughly as long as a human
   * would need to write the message, then clear it before the message lands.
   */
  private async simulateTyping(socket: WASocket, jid: string, content: string): Promise<void> {
    const duration = Math.min(
      Math.max(content.length * this.typingCharMs, this.typingMinMs),
      this.typingMaxMs,
    );

    try {
      await socket.sendPresenceUpdate('composing', jid);
    } catch (error) {
      this.logger.warn(`Typing presence failed for ${jid}: ${String(error)}`);
      return;
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, duration);
      timer.unref?.();
    });

    try {
      await socket.sendPresenceUpdate('paused', jid);
    } catch (error) {
      this.logger.warn(`Typing "paused" presence failed for ${jid}: ${String(error)}`);
    }
  }

  private async spawnSocket(accountId: string): Promise<void> {
    let session = this.sessions.get(accountId);
    if (!session || session.aborted) {
      return;
    }

    let auth;
    try {
      auth = await useMultiFileAuthState(this.sessionPathFor(accountId));
    } catch (error) {
      this.logger.warn(`Auth state load failed for ${accountId}: ${String(error)}`);
      await this.handleSpawnFailure(session);
      return;
    }

    // Re-check: the session may have been aborted while we awaited file I/O.
    session = this.sessions.get(accountId);
    if (!session || session.aborted) {
      return;
    }

    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch (error) {
      this.logger.warn(`Version fetch failed for ${accountId}: ${String(error)}`);
      await this.handleSpawnFailure(session);
      return;
    }

    session = this.sessions.get(accountId);
    if (!session || session.aborted) {
      return;
    }

    let socket: WASocket;
    try {
      socket = makeWASocket({
        version,
        browser: Browsers.appropriate('Chrome'),
        auth: { creds: auth.state.creds, keys: auth.state.keys },
        logger: new BaileysForwardLogger(),
        markOnlineOnConnect: false,
        syncFullHistory: false,
      });
    } catch (error) {
      this.logger.error(`Socket creation failed for ${accountId}: ${String(error)}`);
      await this.handleSpawnFailure(session);
      return;
    }

    const boundSession = session;
    boundSession.socket = socket;

    const onCredsUpdate = () => {
      void auth.saveCreds().catch((error: unknown) => {
        this.logger.warn(`Failed to persist creds for ${accountId}: ${String(error)}`);
      });
    };
    socket.ev.on('creds.update', onCredsUpdate);

    socket.ev.on('connection.update', (update) => {
      void this.handleConnectionUpdate(accountId, boundSession, socket, update);
    });

    socket.ev.on('messages.update', (updates) => {
      void this.handleMessageUpdates(accountId, updates);
    });
  }

  private async handleConnectionUpdate(
    accountId: string,
    session: ActiveWhatsAppSession,
    socket: WASocket,
    update: Partial<ConnectionState>,
  ): Promise<void> {
    if (session.aborted) {
      return;
    }

    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      this.clearQr(session);
      session.activeQr = qr;
      session.activeQrExpiresAt = Date.now() + QR_TTL_MS;
      session.qrTimer = setTimeout(() => {
        session.activeQr = undefined;
        session.activeQrExpiresAt = undefined;
      }, QR_TTL_MS);
      session.qrTimer.unref?.();

      const image = await QRCode.toDataURL(qr, { margin: 1, width: 320 }).catch(
        () => undefined,
      );
      this.events.emitQr({ accountId, qr, image });

      if (session.status !== WhatsAppAccountStatus.CONNECTING) {
        await this.applyStatus(session, WhatsAppAccountStatus.CONNECTING);
      }
      return;
    }

    if (connection === 'open') {
      this.clearReconnect(session);
      this.clearQr(session);
      session.retryCount = 0;

      const phone = this.extractPhone(socket.user);
      session.phone = phone;
      await this.applyStatus(session, WhatsAppAccountStatus.CONNECTED, {
        phone,
        connectedAt: true,
      });
      this.events.emitConnected({ accountId, phone });
      return;
    }

    if (connection === 'close') {
      this.clearReconnect(session);
      this.clearQr(session);

      const reason = this.getDisconnectReason(lastDisconnect);
      const action = this.classifyDisconnect(reason);

      if (action === 'LOGGED_OUT') {
        this.logger.warn(
          `Session invalidated for ${accountId} (reason=${this.reasonLabel(reason)}); marking LOGGED_OUT and removing session`,
        );
        await this.applyLoggedOut(accountId);
        await this.removeSessionFolder(accountId);
        this.sessions.delete(accountId);
        return;
      }

      if (action === 'STOP') {
        this.logger.warn(
          `Connection closed for ${accountId} (reason=${this.reasonLabel(reason)}); not retrying`,
        );
        await this.applyDisconnected(accountId, this.reasonLabel(reason));
        this.events.emitStatus({ accountId, status: WhatsAppAccountStatus.DISCONNECTED });
        return;
      }

      if (action === 'RECONNECT') {
        this.logger.warn(`Reconnect requested for ${accountId} (reason=restart_required)`);
        await this.applyStatus(session, WhatsAppAccountStatus.CONNECTING);
        void this.spawnSocket(accountId);
        return;
      }

      // action === 'RETRY'
      await this.applyDisconnected(accountId, this.reasonLabel(reason));
      this.events.emitStatus({ accountId, status: WhatsAppAccountStatus.DISCONNECTED });

      if (session.aborted) {
        return;
      }

      await this.scheduleRetry(session, reason);
    }
  }

  private async handleSpawnFailure(session: ActiveWhatsAppSession): Promise<void> {
    await this.applyDisconnected(session.accountId, 'spawn_failed');
    this.events.emitStatus({ accountId: session.accountId, status: WhatsAppAccountStatus.DISCONNECTED });

    if (session.aborted) {
      return;
    }

    await this.scheduleRetry(session, null);
  }

  /**
   * Schedule a bounded retry with exponential-style backoff. The delay
   * chosen depends on the current retryCount, incrementing it and arming the
   * reconnect timer.
   */
  private async scheduleRetry(
    session: ActiveWhatsAppSession,
    reason: number | null,
  ): Promise<void> {
    if (session.retryCount >= MAX_RETRIES) {
      this.logger.warn(
        `Socket closed for ${session.accountId} (reason=${this.reasonLabel(reason)}); retries exhausted, staying DISCONNECTED`,
      );
      return;
    }

    const delay =
      RETRY_DELAYS_MS[session.retryCount] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

    session.retryCount += 1;

    this.logger.warn(
      `Socket closed for ${session.accountId} (reason=${this.reasonLabel(reason)}), retry ${session.retryCount}/${MAX_RETRIES} in ${delay}ms`,
    );

    await this.applyStatus(session, WhatsAppAccountStatus.CONNECTING);
    session.reconnectTimer = setTimeout(() => {
      void this.spawnSocket(session.accountId);
    }, delay);
    session.reconnectTimer.unref?.();
  }

  /**
   * Map a Baileys disconnect reason to a high-level action so the decision
   * logic is centralised instead of scattered across hardcoded branches.
   *
   *  - LOGGED_OUT : session permanently invalid; remove files, require re-login.
   *  - STOP       : connection lost with no chance of recovery; do not retry.
   *  - RECONNECT  : WhatsApp server explicitly requested a reconnect; do it now.
   *  - RETRY      : temporary failure; bounded automatic retry.
   */
  private classifyDisconnect(reason: number | null): 'LOGGED_OUT' | 'STOP' | 'RECONNECT' | 'RETRY' {
    switch (reason) {
      case DisconnectReason.loggedOut:
      case DisconnectReason.badSession:
      case DisconnectReason.forbidden:
      case DisconnectReason.multideviceMismatch:
        return 'LOGGED_OUT';
      case DisconnectReason.connectionReplaced:
        return 'STOP';
      case DisconnectReason.restartRequired:
        return 'RECONNECT';
      default:
        return 'RETRY';
    }
  }

  private async applyStatus(
    session: ActiveWhatsAppSession,
    status: WhatsAppAccountStatus,
    meta?: { phone?: string | null; connectedAt?: boolean },
  ): Promise<void> {
    session.status = status;
    try {
      await this.service.persistStatus(session.accountId, status, meta);
    } catch (error) {
      this.logger.warn(`Failed to persist ${status} for ${session.accountId}: ${String(error)}`);
    }
    this.events.emitStatus({ accountId: session.accountId, status });
  }

  private async applyDisconnected(accountId: string, reason: string): Promise<void> {
    try {
      await this.service.persistStatus(accountId, WhatsAppAccountStatus.DISCONNECTED, {
        disconnectedAt: true,
      });
    } catch (error) {
      this.logger.warn(`Failed to persist DISCONNECTED for ${accountId}: ${String(error)}`);
    }
    this.events.emitDisconnected({ accountId, reason });
  }

  private async applyLoggedOut(accountId: string): Promise<void> {
    try {
      await this.service.persistStatus(accountId, WhatsAppAccountStatus.LOGGED_OUT, {
        disconnectedAt: true,
      });
    } catch (error) {
      this.logger.warn(`Failed to persist LOGGED_OUT for ${accountId}: ${String(error)}`);
    }
    this.events.emitStatus({ accountId, status: WhatsAppAccountStatus.LOGGED_OUT });
  }

  private async closeSocket(session: ActiveWhatsAppSession): Promise<void> {
    const socket = session.socket;
    if (!socket) {
      return;
    }
    try {
      await socket.end(undefined);
    } catch {
      // best-effort close
    }
    try {
      await socket.ws.close();
    } catch {
      // best-effort close
    }
  }

  private clearReconnect(session: ActiveWhatsAppSession): void {
    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = undefined;
    }
  }

  private clearQr(session: ActiveWhatsAppSession): void {
    if (session.qrTimer) {
      clearTimeout(session.qrTimer);
      session.qrTimer = undefined;
    }
    session.activeQr = undefined;
    session.activeQrExpiresAt = undefined;
  }

  private isQrValid(session: ActiveWhatsAppSession): boolean {
    if (!session.activeQr || !session.activeQrExpiresAt) {
      return false;
    }
    return Date.now() < session.activeQrExpiresAt;
  }

  private getDisconnectReason(
    lastDisconnect?: { error: Boom | Error | undefined; date: Date },
  ): number | null {
    const error = lastDisconnect?.error;
    if (error instanceof Boom) {
      return error.output?.statusCode ?? null;
    }
    return null;
  }

  private reasonLabel(reason: number | null): string {
    switch (reason) {
      case DisconnectReason.loggedOut:
        return 'logged_out';
      case DisconnectReason.restartRequired:
        return 'restart_required';
      case DisconnectReason.badSession:
        return 'bad_session';
      case DisconnectReason.connectionReplaced:
        return 'connection_replaced';
      case DisconnectReason.forbidden:
        return 'forbidden';
      case DisconnectReason.unavailableService:
        return 'service_unavailable';
      default:
        return 'connection_lost';
    }
  }

  private extractPhone(user: Contact | undefined): string | null {
    if (!user) {
      return null;
    }

    if (user.phoneNumber) {
      const digits = user.phoneNumber.replace(/\D/g, '');
      if (digits.length > 0) {
        return digits;
      }
    }

    if (user.id) {
      const digits = user.id.split('@')[0].split(':')[0].replace(/\D/g, '');
      if (digits.length > 0) {
        return digits;
      }
    }

    return null;
  }

  private sessionPathFor(accountId: string): string {
    return path.join(this.sessionRoot, accountId);
  }

  private ensureSessionRoot(): void {
    void fs.mkdir(this.sessionRoot, { recursive: true });
  }

  private async removeSessionFolder(accountId: string): Promise<void> {
    const dir = this.sessionPathFor(accountId);
    const resolved = path.resolve(dir);
    if (!resolved.startsWith(this.sessionRoot + path.sep)) {
      this.logger.warn(`Refusing to remove session dir outside root: ${dir}`);
      return;
    }
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to remove session folder ${dir}: ${String(error)}`);
    }
  }
}