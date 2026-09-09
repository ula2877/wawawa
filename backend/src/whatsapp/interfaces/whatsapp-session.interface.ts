import type { WASocket } from '@whiskeysockets/baileys';
import type { WhatsAppAccountStatus } from '../../generated/prisma/client.js';

/**
 * Per-account in-memory state owned by WhatsAppManager. One entry per
 * WhatsApp account; the Map<accountId, session> is the single source of
 * truth for the live socket lifecycle while the DB row holds the persisted
 * status.
 */
export interface ActiveWhatsAppSession {
  accountId: string;
  socket?: WASocket;
  status: WhatsAppAccountStatus;
  phone?: string | null;
  retryCount: number;
  reconnectTimer?: NodeJS.Timeout;
  qrTimer?: NodeJS.Timeout;
  activeQr?: string;
  activeQrExpiresAt?: number;
  aborted: boolean;
}

/**
 * Lightweight snapshot replayed to Socket.IO clients on (re)connect so that
 * a freshly-opened frontend page can catch up on the current status and any
 * still-valid pending QR without polling.
 */
export interface WhatsAppSessionSnapshot {
  accountId: string;
  status: WhatsAppAccountStatus;
  qr?: string;
  phone?: string | null;
}

export interface ConnectedEventPayload {
  accountId: string;
  phone: string | null;
}

export interface DisconnectedEventPayload {
  accountId: string;
  reason: string;
}

export interface QrEventPayload {
  accountId: string;
  qr: string;
  image?: string;
}

export interface StatusEventPayload {
  accountId: string;
  status: WhatsAppAccountStatus;
}

export interface MessageQueuedEventPayload {
  accountId: string;
}

export interface MessageSentEventPayload {
  id: string;
  accountId: string;
  sentAt: string;
}

export interface MessageFailedEventPayload {
  id: string;
  accountId: string;
  failedAt: string;
  lastError?: string;
}

export interface MessageDeliveredEventPayload {
  id: string;
  accountId: string;
  deliveredAt: string;
}

export interface MessageReadEventPayload {
  id: string;
  accountId: string;
  readAt: string;
}

export interface MessageCampaignTerminalPayload {
  campaignId: number;
  messageId: string;
  recipientId: number | null;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  lastError?: string;
}