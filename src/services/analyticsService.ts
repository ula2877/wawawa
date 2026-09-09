import { format } from 'date-fns';
import type { CampaignPerformancePoint, MessageStatSlice } from '@/types';
import { apiFetch } from './api';

type AnalyticsRange = 'today' | '7d' | '30d' | '90d';

interface SummaryDTO {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
  pending: number;
  delivery_rate: number;
  read_rate: number;
  failure_rate: number;
}

interface PerformancePointDTO {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

interface StatDTO {
  name: string;
  value: number;
}

interface TopCampaignDTO {
  id: number;
  name: string;
  recipients: number;
  delivered: number;
  read: number;
  failed: number;
  rate: number;
}

interface SenderDTO {
  name: string;
  phone: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  rate: number;
}

/**
 * Backend returns UTC day keys for ranges and "HH:00" keys for today.
 */
function label(date: string): string {
  if (date.includes('T') && date.slice(11, 16).endsWith(':00')) return date.slice(11, 16);
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? date : format(d, 'd MMM');
}

export const analyticsService = {
  /** Real KPIs derived from the recipient send/delivery/read timestamps. */
  async getKpis(): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    pending: number;
    deliveryRate: number;
    readRate: number;
    failureRate: number;
  }> {
    const res = await apiFetch<SummaryDTO>('/analytics/summary');
    return {
      totalSent: res.total_sent,
      totalDelivered: res.total_delivered,
      totalRead: res.total_read,
      totalFailed: res.total_failed,
      pending: res.pending,
      deliveryRate: res.delivery_rate,
      readRate: res.read_rate,
      failureRate: res.failure_rate,
    };
  },

  async getPerformanceSeries(range: AnalyticsRange): Promise<CampaignPerformancePoint[]> {
    const res = await apiFetch<{ data: PerformancePointDTO[] }>(`/analytics/performance?range=${range}`);
    return res.data.map((p) => ({
      date: label(p.date),
      sent: p.sent,
      delivered: p.delivered,
      read: p.read,
      failed: p.failed,
    }));
  },

  async getMessageStats(): Promise<MessageStatSlice[]> {
    const res = await apiFetch<{ data: StatDTO[] }>('/analytics/stats');
    return res.data;
  },

  async getProviderStats(): Promise<MessageStatSlice[]> {
    const res = await apiFetch<{ data: StatDTO[] }>('/analytics/providers');
    return res.data;
  },

  async getTopCampaigns(): Promise<
    { id: string; name: string; recipients: number; delivered: number; read: number; failed: number; rate: number }[]
  > {
    const res = await apiFetch<{ data: TopCampaignDTO[] }>('/analytics/top-campaigns');
    return res.data.map((c) => ({ ...c, id: String(c.id) }));
  },

  async getSenderPerformance(): Promise<SenderDTO[]> {
    const res = await apiFetch<{ data: SenderDTO[] }>('/analytics/senders');
    return res.data.map((s) => ({ ...s, phone: s.phone ?? '' }));
  },
};