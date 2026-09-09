import type { Settings } from '@/types';
import { apiFetch } from './api';

export interface PasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

interface SettingsPayload {
  companyName?: string;
  timezone?: string;
  language?: string;
  defaultSenderId?: string | null;
  rateLimitPerMin?: number;
  retryLimit?: number;
  delayBetweenMs?: number;
  notifyCampaignCompleted?: boolean;
  notifyCampaignFailed?: boolean;
  notifyConnectionError?: boolean;
  notifyLowQuota?: boolean;
  messageQuota?: number;
}

export const settingsService = {
  async get(): Promise<Settings> {
    const { data } = await apiFetch<{ data: Settings }>('/settings');
    return data;
  },

  async save(settings: Settings): Promise<Settings> {
    const payload: SettingsPayload = {
      companyName: settings.general.companyName,
      timezone: settings.general.timezone,
      language: settings.general.language,
      defaultSenderId: settings.whatsapp.defaultSenderId || null,
      rateLimitPerMin: settings.whatsapp.rateLimitPerMin,
      retryLimit: settings.whatsapp.retryLimit,
      delayBetweenMs: settings.whatsapp.delayBetweenMs,
      notifyCampaignCompleted: settings.notifications.campaignCompleted,
      notifyCampaignFailed: settings.notifications.campaignFailed,
      notifyConnectionError: settings.notifications.connectionError,
      notifyLowQuota: settings.notifications.lowQuota,
      messageQuota: settings.billing.messageQuota,
    };
    const { data } = await apiFetch<{ data: Settings }>('/settings', {
      method: 'PUT',
      json: payload,
    });
    return data;
  },

  async changePassword(payload: PasswordPayload): Promise<void> {
    await apiFetch('/profile/password', { method: 'PUT', json: payload });
  },
};