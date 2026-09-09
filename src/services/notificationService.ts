import type { AppNotification } from '@/types';
import { apiFetch } from './api';

export const notificationService = {
  async get(): Promise<AppNotification[]> {
    const res = await apiFetch<{ data: AppNotification[] }>('/notifications');
    return res.data;
  },
};