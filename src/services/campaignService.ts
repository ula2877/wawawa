import type { Campaign, CampaignRecipient, CampaignStatus } from '@/types';
import { apiFetch } from './api';

/**
 * Backend-facing DTOs (NestJS Campaign resources) and the Laravel-style
 * pagination envelope. The service normalizes these into the frontend
 * Campaign type used by the components. Statuses are upper-case on the wire.
 */

export interface CampaignDTO {
  id: number;
  name: string;
  description: string | null;
  status: string;
  whatsapp_account_id: string;
  template_id: number | null;
  template_content_snapshot: string;
  scheduled_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  recipients_count: number;
  media_path: string | null;
  media_type: string | null;
  media_name: string | null;
  media_mimetype: string | null;
  media_size: number | null;
  created_at: string;
  updated_at: string;
  template?: { id: number; name: string; category: string } | null;
  whatsapp_account?: { id: string; name: string; phone: string | null; status: string } | null;
  recipient_stats?: {
    pending: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    skipped: number;
  };
  targets?: {
    contact_ids: number[];
    groups: { id: number; name: string }[];
  } | null;
}

export interface CampaignRecipientDTO {
  id: number;
  campaign_id: number;
  contact_id: number | null;
  contact: { id: number; name: string; phone: string } | null;
  phone: string;
  status: string;
  skip_reason: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  skipped_at: string | null;
  created_at: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

/** One point of the campaign "sent over time" chart (UTC hourly bucket). */
export interface CampaignSentOverTimePoint {
  bucket: string;
  sent: number;
  delivered: number;
  read: number;
}

/** Result of uploading an attachment to the backend media endpoint. */
export interface MediaUploadResult {
  mediaPath: string;
  mediaType: Exclude<Campaign['mediaType'], 'none'>;
  mediaName: string;
  mediaMimetype: string;
  mediaSize: number;
}

type Single<T> = { data: T };

export interface CampaignQuery {
  search?: string;
  status?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface CampaignInput {
  name: string;
  description?: string;
  senderId: string;
  templateId?: number | null;
  /** Final message body (may differ from the template the user picked). */
  content?: string
  contactIds?: string[];
  groupIds?: string[];
  scheduledAt?: string | null;
  mediaPath?: string | null;
  mediaType?: Exclude<Campaign['mediaType'], 'none'>;
  mediaName?: string;
  mediaMimetype?: string;
  mediaSize?: number;
}

const STATUS_MAP: Record<string, CampaignStatus> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  RUNNING: 'Running',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

function toStatus(status: string): CampaignStatus {
  return STATUS_MAP[status.toUpperCase()] ?? 'Draft';
}

function normalizeCampaign(raw: CampaignDTO, groups: { id: number; name: string }[] = []): Campaign {
  const sent = raw.recipient_stats?.sent ?? 0;
  const recipients = raw.recipients_count;
  // Skipped recipients are rendered as failures in the recipient view, so we
  // surface them under the same "Failed" figure for consistency.
  const failed = (raw.recipient_stats?.failed ?? 0) + (raw.recipient_stats?.skipped ?? 0);
  return {
    id: String(raw.id),
    name: raw.name,
    description: raw.description ?? '',
    senderId: raw.whatsapp_account_id,
    senderName: raw.whatsapp_account?.name ?? '',
    recipients,
    sent,
    delivered: raw.recipient_stats?.delivered ?? 0,
    read: raw.recipient_stats?.read ?? 0,
    failed,
    status: toStatus(raw.status),
    scheduledAt: raw.scheduled_at,
    message: raw.template_content_snapshot,
    mediaType: (raw.media_type ?? 'none') as Campaign['mediaType'],
    mediaName: raw.media_name ?? undefined,
    mediaPath: raw.media_path ?? undefined,
    mediaMimetype: raw.media_mimetype ?? undefined,
    mediaSize: raw.media_size ?? undefined,
    createdAt: raw.created_at,
    groupIds: groups.map((g) => String(g.id)),
    contactIds: (raw.targets?.contact_ids ?? []).map(String),
    progress: recipients ? Math.round((sent / recipients) * 100) : 0,
  };
}

const RECIPIENT_STATUS: Record<string, CampaignRecipient['status']> = {
  PENDING: 'Pending',
  QUEUED: 'Pending',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Failed',
  SKIPPED: 'Failed',
};

function normalizeRecipient(raw: CampaignRecipientDTO): CampaignRecipient {
  const derivedStatus: CampaignRecipient['status'] =
    raw.read_at != null
      ? 'Read'
      : raw.delivered_at != null
        ? 'Delivered'
        : RECIPIENT_STATUS[raw.status.toUpperCase()] ?? 'Pending';
  return {
    id: String(raw.id),
    name: raw.contact?.name ?? raw.phone,
    phone: raw.phone,
    status: derivedStatus,
    sentAt: raw.sent_at,
    deliveredAt: raw.delivered_at,
    readAt: raw.read_at,
    error: raw.skip_reason,
  };
}

function toIds(ids: string[]): number[] {
  return ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
}

function buildQuery(params: CampaignQuery = {}): URLSearchParams {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query;
}

export const campaignService = {
  /**
   * Full, unpaginated campaign list. Used by screens that need the complete
   * dataset (dashboard, reports, message logs).
   */
  async getCampaigns(): Promise<Campaign[]> {
    const res = await apiFetch<Paged<CampaignDTO>>('/campaigns?per_page=100');
    return res.data.map((c) => normalizeCampaign(c));
  },

  /**
   * Paginated campaign list with backend search/filter/sort/pagination.
   */
  async getCampaignsPage(params: CampaignQuery = {}): Promise<Paged<Campaign>> {
    const query = buildQuery(params);
    const res = await apiFetch<Paged<CampaignDTO>>(`/campaigns?${query.toString()}`);
    return { data: res.data.map((c) => normalizeCampaign(c)), meta: res.meta };
  },

  async getCampaign(id: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}`);
    const target = res.data.targets;
    return normalizeCampaign(res.data, target?.groups ?? []);
  },

  async getCampaignRecipients(id: string, params: { page?: number; per_page?: number } = {}): Promise<Paged<CampaignRecipient>> {
    const query = buildQuery({ per_page: params.per_page ?? 25, page: params.page });
    const res = await apiFetch<Paged<CampaignRecipientDTO>>(`/campaigns/${id}/recipients?${query.toString()}`);
    return { data: res.data.map(normalizeRecipient), meta: res.meta };
  },

  /**
   * Hourly sending/delivery/read activity for a campaign. Used by the
   * "Sent over time" chart on the detail page.
   */
  async getSentOverTime(id: string): Promise<CampaignSentOverTimePoint[]> {
    const res = await apiFetch<{ data: CampaignSentOverTimePoint[] }>(`/campaigns/${id}/sent-over-time`);
    return res.data;
  },

  async createCampaign(input: CampaignInput): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>('/campaigns', {
      method: 'POST',
      json: {
        name: input.name,
        description: input.description || null,
        whatsapp_account_id: input.senderId,
        template_id: input.templateId ?? null,
        content: input.content ?? null,
        contact_ids: toIds(input.contactIds ?? []),
        group_ids: toIds(input.groupIds ?? []),
        scheduled_at: input.scheduledAt ?? null,
        media_path: input.mediaPath ?? null,
        media_type: input.mediaType ?? null,
        media_name: input.mediaName ?? null,
        media_mimetype: input.mediaMimetype ?? null,
        media_size: input.mediaSize ?? null,
      },
    });
    return normalizeCampaign(res.data);
  },

  async updateCampaign(id: string, patch: Partial<CampaignInput>): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}`, {
      method: 'PATCH',
      json: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description || null } : {}),
        ...(patch.scheduledAt !== undefined ? { scheduled_at: patch.scheduledAt ?? null } : {}),
        ...(patch.contactIds !== undefined ? { contact_ids: toIds(patch.contactIds) } : {}),
        ...(patch.groupIds !== undefined ? { group_ids: toIds(patch.groupIds) } : {}),
        ...(patch.content !== undefined ? { content: patch.content ?? null } : {}),
        ...(patch.mediaPath !== undefined
          ? {
              media_path: patch.mediaPath ?? null,
              media_type: patch.mediaType ?? null,
              media_name: patch.mediaName ?? null,
              media_mimetype: patch.mediaMimetype ?? null,
              media_size: patch.mediaSize ?? null,
            }
          : {}),
      },
    });
    return normalizeCampaign(res.data);
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiFetch<void>(`/campaigns/${id}`, { method: 'DELETE' });
  },

  async deleteCampaigns(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteCampaign(id);
    }
  },

  async sendCampaign(id: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}/send`, { method: 'POST' });
    return normalizeCampaign(res.data);
  },

  async scheduleCampaign(id: string, scheduledAt: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}/schedule`, {
      method: 'POST',
      json: { scheduled_at: scheduledAt },
    });
    return normalizeCampaign(res.data);
  },

  async pauseCampaign(id: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}/pause`, { method: 'POST' });
    return normalizeCampaign(res.data);
  },

  async resumeCampaign(id: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}/resume`, { method: 'POST' });
    return normalizeCampaign(res.data);
  },

  async cancelCampaign(id: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}/cancel`, { method: 'POST' });
    return normalizeCampaign(res.data);
  },

  async duplicateCampaign(id: string): Promise<Campaign> {
    const res = await apiFetch<Single<CampaignDTO>>(`/campaigns/${id}/duplicate`, { method: 'POST' });
    return normalizeCampaign(res.data);
  },

  /**
   * Upload a campaign attachment to the backend. Returns the server-side
   * metadata (stored file path + type + original name) that must be included
   * in the create/update campaign payload.
   */
  async uploadMedia(file: File): Promise<MediaUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiFetch<{
      media_path: string;
      media_type: MediaUploadResult['mediaType'];
      media_name: string;
      media_mimetype: string;
      media_size: number;
    }>('/media', { method: 'POST', body: formData });
    return {
      mediaPath: res.media_path,
      mediaType: res.media_type,
      mediaName: res.media_name,
      mediaMimetype: res.media_mimetype,
      mediaSize: res.media_size,
    };
  },

  /** Backwards-compatible status helper; maps to the right transition endpoint. */
  async setStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    switch (status) {
      case 'Running':
        return this.sendCampaign(id);
      case 'Paused':
        return this.pauseCampaign(id);
      default:
        throw new Error(`Unsupported status transition "${status}".`);
    }
  },
};