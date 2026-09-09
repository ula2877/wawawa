import { format } from 'date-fns';
import type { ActivityLog, CampaignPerformancePoint, DashboardSummary, MessageStatSlice } from '@/types';
import { apiFetch } from './api';

type DashboardRange = 'today' | '7d' | '30d' | '90d';

interface SummaryDTO {
  total_contacts: number;
  contacts_growth: number;
  campaigns: number;
  campaigns_growth: number;
  messages_sent: number;
  messages_growth: number;
  delivery_rate: number;
  delivery_growth: number;
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

interface ActivityDTO {
  id: string;
  user: string;
  action: string;
  module: string;
  date: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dayLabel(date: string): string {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? date : format(d, 'd MMM');
}

/** Backend returns UTC day keys for ranges and "HH:00" keys for today. */
function label(date: string): string {
  return date.includes('T') && date.slice(11, 16).endsWith(':00') ? date.slice(11, 16) : dayLabel(date);
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await apiFetch<SummaryDTO>('/dashboard/summary');
    return {
      totalContacts: res.total_contacts,
      contactsGrowth: round1(res.contacts_growth),
      campaigns: res.campaigns,
      campaignsGrowth: round1(res.campaigns_growth),
      messagesSent: res.messages_sent,
      messagesGrowth: round1(res.messages_growth),
      deliveryRate: round1(res.delivery_rate),
      deliveryGrowth: round1(res.delivery_growth),
    };
  },

  async getPerformance(range: DashboardRange): Promise<CampaignPerformancePoint[]> {
    const res = await apiFetch<{ data: PerformancePointDTO[] }>(`/dashboard/performance?range=${range}`);
    return res.data.map((p) => ({
      date: label(p.date),
      sent: p.sent,
      delivered: p.delivered,
      read: p.read,
      failed: p.failed,
    }));
  },

  async getMessageStats(): Promise<MessageStatSlice[]> {
    const res = await apiFetch<{ data: StatDTO[] }>('/dashboard/stats');
    return res.data;
  },

  async getActivity(): Promise<ActivityLog[]> {
    const res = await apiFetch<{ data: ActivityDTO[] }>('/dashboard/activity');
    return res.data.map((a): ActivityLog => ({
      id: a.id,
      user: a.user,
      action: a.action,
      module: a.module as ActivityLog['module'],
      date: a.date,
    }));
  },
};