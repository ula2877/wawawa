import type { WhatsAppAccount } from '@/types';

export const mockAccounts: WhatsAppAccount[] = [
  {
    id: 'WA-001',
    name: 'Marketing 01',
    phone: '+62 812-3456-7890',
    status: 'connected',
    is_default: true,
    last_connected_at: '2026-08-31T08:00:00Z',
    last_disconnected_at: null,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-08-31T08:00:00Z',
  },
  {
    id: 'WA-002',
    name: 'Marketing 02',
    phone: '+62 813-9876-5432',
    status: 'connected',
    is_default: false,
    last_connected_at: '2026-08-31T08:05:00Z',
    last_disconnected_at: null,
    created_at: '2026-02-14T11:30:00Z',
    updated_at: '2026-08-31T08:05:00Z',
  },
  {
    id: 'WA-003',
    name: 'Support 01',
    phone: null,
    status: 'logged_out',
    is_default: false,
    last_connected_at: '2026-08-30T22:14:00Z',
    last_disconnected_at: '2026-08-30T22:40:00Z',
    created_at: '2026-03-02T09:15:00Z',
    updated_at: '2026-08-30T22:40:00Z',
  },
];