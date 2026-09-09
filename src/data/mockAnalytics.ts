import type { CampaignPerformancePoint, MessageStatSlice } from '@/types';

function days(offsetFromToday: number, hour = 10): string {
  const d = new Date(Date.now() - offsetFromToday * 24 * 60 * 60 * 1000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const seed = [5120, 6480, 4800, 7400, 6900, 8150, 9200, 7600, 8900, 10500, 11200, 9800];

export const performanceSeries: CampaignPerformancePoint[] = seed.map((base, i) => {
  const sent = base;
  const delivered = Math.round(sent * (0.93 + (i % 3) * 0.02));
  const read = Math.round(delivered * (0.8 + (i % 4) * 0.04));
  const failed = sent - delivered;
  return {
    date: days(11 - i),
    sent,
    delivered,
    read,
    failed,
  };
});

const todaySeed = [820, 1240, 960, 1520, 1380, 1710, 1500, 1840, 2100, 1960, 2280, 2400];

export const todaySeries: CampaignPerformancePoint[] = todaySeed.map((v, i) => ({
  date: `${String(i + 1).padStart(2, '0')}:00`,
  sent: v,
  delivered: Math.round(v * 0.95),
  read: Math.round(v * 0.76),
  failed: Math.round(v * 0.05),
}));

export const weeksSeries: CampaignPerformancePoint[] = [
  '11 Aug', '12 Aug', '13 Aug', '14 Aug', '15 Aug', '16 Aug', '17 Aug',
  '18 Aug', '19 Aug', '20 Aug', '21 Aug', '22 Aug', '23 Aug', '24 Aug',
  '25 Aug', '26 Aug', '27 Aug', '28 Aug', '29 Aug', '30 Aug', '31 Aug',
].map((label, i) => {
  const sent = 4000 + i * 260 + (i % 3) * 400;
  return {
    date: label,
    sent,
    delivered: Math.round(sent * 0.955),
    read: Math.round(sent * 0.8),
    failed: Math.round(sent * 0.045),
  };
});

export const monthsSeries: CampaignPerformancePoint[] = [
  'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
].map((label, i) => {
  const sent = 60000 + i * 14500 + (i % 2) * 8000;
  return {
    date: label,
    sent,
    delivered: Math.round(sent * 0.96),
    read: Math.round(sent * 0.81),
    failed: Math.round(sent * 0.04),
  };
});

export const messageStatSlice: MessageStatSlice[] = [
  { name: 'Delivered', value: 4120 },
  { name: 'Read', value: 5800 },
  { name: 'Failed', value: 180 },
  { name: 'Pending', value: 940 },
];

export const providerSlice: MessageStatSlice[] = [
  { name: 'Marketing 01', value: 12582 },
  { name: 'Marketing 02', value: 8420 },
  { name: 'Support 01', value: 3120 },
];

export const analyticsKpis = {
  totalSent: 24120,
  totalDelivered: 23120,
  totalRead: 19500,
  totalFailed: 1000,
  deliveryRate: 95.8,
  readRate: 80.8,
  failureRate: 4.2,
  responseRate: 12.6,
};

export const topCampaigns = [
  { id: 'CMP-001', name: 'Promo August', recipients: 2450, delivered: 2370, read: 2120, failed: 80, rate: 96.7 },
  { id: 'CMP-013', name: 'Mid Year Sale', recipients: 5400, delivered: 5210, read: 4600, failed: 190, rate: 96.5 },
  { id: 'CMP-003', name: 'Flash Sale Weekend', recipients: 3200, delivered: 2505, read: 2400, failed: 95, rate: 78.3 },
  { id: 'CMP-011', name: 'Price Drop Kaos', recipients: 3100, delivered: 3050, read: 2800, failed: 50, rate: 98.4 },
  { id: 'CMP-017', name: 'Lebaran Sale', recipients: 6800, delivered: 6550, read: 5900, failed: 250, rate: 96.3 },
];

export const senderPerformance = [
  { name: 'Marketing 01', phone: '+62 812-3456-7890', sent: 12582, delivered: 12100, read: 9800, failed: 482, rate: 96.2 },
  { name: 'Marketing 02', phone: '+62 813-9876-5432', sent: 8420, delivered: 8120, read: 7000, failed: 300, rate: 96.4 },
  { name: 'Support 01', phone: '+62 821-5544-3322', sent: 3120, delivered: 2900, read: 2100, failed: 220, rate: 93.0 },
];

export const queueStats = {
  pending: 1250,
  processing: 35,
  sent: 12582,
  failed: 83,
};