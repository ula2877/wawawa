import type { MessageLog, MessageLogStatus, QueueItem } from '@/types';
import { apiFetch } from './api';

/**
 * Backend Messages resource (`/api/messages`). The rows come from the real
 * whatsapp_messages queue, joined to their account/campaign and enriched with
 * delivery/read timestamps so the queue and logs screens show live data.
 */

interface MessageResource {
  id: string;
  recipient: string;
  contact_name: string | null;
  content: string;
  status: string;
  delivery_status: string;
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

interface MessagesPage {
  data: MessageResource[];
  meta: { total: number };
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  total: number;
}

const QUEUE_STATUS: Record<string, QueueItem['status']> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SENT: 'Sent',
  FAILED: 'Failed',
};

const BASE_LOG_STATUS: Record<string, MessageLogStatus> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  FAILED: 'Failed',
};

function displayName(m: MessageResource): string {
  return m.contact_name || m.recipient;
}

function timeOf(m: MessageResource): string {
  return m.sent_at ?? m.failed_at ?? m.scheduled_at ?? m.created_at ?? '';
}

function toQueueItem(m: MessageResource): QueueItem {
  return {
    id: m.id,
    recipient: displayName(m),
    phone: m.recipient,
    campaignId: m.campaign_id != null ? String(m.campaign_id) : '',
    campaignName: m.campaign_name ?? '',
    senderName: m.sender_name ?? '',
    status: QUEUE_STATUS[m.status] ?? 'Pending',
    scheduledAt: timeOf(m),
    attempts: m.attempts,
  };
}

function toLog(m: MessageResource): MessageLog {
  const status: MessageLogStatus =
    m.read_at != null ? 'Read' : m.delivered_at != null ? 'Delivered' : (BASE_LOG_STATUS[m.status] ?? 'Pending');
  return {
    id: m.id,
    time: timeOf(m),
    recipient: displayName(m),
    phone: m.recipient,
    campaignId: m.campaign_id != null ? String(m.campaign_id) : '',
    campaignName: m.campaign_name ?? '',
    senderName: m.sender_name ?? '',
    message: m.content,
    status,
    error: m.last_error,
  };
}

export const queueService = {
  /** Recent queue rows (all statuses), newest first. */
  async getQueue(): Promise<QueueItem[]> {
    const res = await apiFetch<MessagesPage>('/messages?per_page=100');
    return res.data.map(toQueueItem);
  },

  /** Live counts across the whole queue, not just the fetched page. */
  async getStats(): Promise<QueueStats> {
    return apiFetch<QueueStats>('/messages/stats');
  },

  /** Remove a not-yet-sent message from the queue. */
  async cancelItem(id: string): Promise<void> {
    await apiFetch(`/messages/${id}`, { method: 'DELETE' });
  },

  /** Requeue a failed message through the normal worker path. */
  async retryItem(id: string): Promise<void> {
    await apiFetch(`/messages/${id}/retry`, { method: 'POST' });
  },
};

export const messageLogService = {
  /** Recent message records with their delivery/read state. */
  async getLogs(): Promise<{ data: MessageLog[]; total: number }> {
    const res = await apiFetch<MessagesPage>('/messages?per_page=100');
    return { data: res.data.map(toLog), total: res.meta.total };
  },

  async getQueueStats(): Promise<QueueStats> {
    return queueService.getStats();
  },

  async setLogStatus(_id: string, _status: MessageLogStatus): Promise<void> {
    throw new Error('Manual log status changes are not supported in real mode.');
  },
};