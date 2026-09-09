import type { Settings, UserProfile } from '@/types';

export const mockUser: UserProfile = {
  id: 'US-001',
  name: 'John Prakoso',
  email: 'admin@blast.io',
  phone: '+62 811-2233-4455',
  avatarColor: 'bg-emerald-500',
  role: 'Owner',
};

export const mockSettings: Settings = {
  general: {
    companyName: 'PT Blast Indonesia',
    timezone: 'Asia/Jakarta',
    language: 'id',
  },
  whatsapp: {
    defaultSenderId: 'WA-001',
    rateLimitPerMin: 60,
    retryLimit: 3,
    delayBetweenMs: 500,
  },
  notifications: {
    campaignCompleted: true,
    campaignFailed: true,
    connectionError: true,
    lowQuota: true,
  },
  billing: {
    messagesUsed: 45230,
    messageQuota: 100000,
  },
};

export const MOCK_CREDENTIALS = {
  email: 'admin@blast.io',
  password: 'admin123',
};