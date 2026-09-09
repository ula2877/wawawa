import type { ActivityLog, AppNotification, MessageLog, QueueItem, TeamMember } from '@/types';

export const mockQueue: QueueItem[] = [
  { id: 'QU-0001', recipient: 'Budi Santoso', phone: '+6281234567890', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Pending', scheduledAt: '2026-08-31T12:00:00Z', attempts: 0 },
  { id: 'QU-0002', recipient: 'Siti Rahayu', phone: '+6281234567891', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Pending', scheduledAt: '2026-08-31T12:00:00Z', attempts: 0 },
  { id: 'QU-0003', recipient: 'Ahmad Fauzi', phone: '+6281234567892', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Processing', scheduledAt: '2026-08-31T11:59:40Z', attempts: 1 },
  { id: 'QU-0004', recipient: 'Dewi Lestari', phone: '+6281234567893', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Processing', scheduledAt: '2026-08-31T11:59:50Z', attempts: 1 },
  { id: 'QU-0005', recipient: 'Maya Anggraini', phone: '+6281234567895', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Sent', scheduledAt: '2026-08-31T11:58:00Z', attempts: 1 },
  { id: 'QU-0006', recipient: 'Yuni Astuti', phone: '+6281234567905', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Sent', scheduledAt: '2026-08-31T11:57:00Z', attempts: 1 },
  { id: 'QU-0007', recipient: 'Lina Marlina', phone: '+6281234567901', campaignId: 'CMP-003', campaignName: 'Flash Sale Weekend', senderName: 'Marketing 02', status: 'Failed', scheduledAt: '2026-08-31T11:55:00Z', attempts: 3 },
  { id: 'QU-0008', recipient: 'Rudi Hartono', phone: '+6281234567894', campaignId: 'CMP-006', campaignName: 'Restock Jaket Hoodie', senderName: 'Support 01', status: 'Pending', scheduledAt: '2026-09-01T10:00:00Z', attempts: 0 },
  { id: 'QU-0009', recipient: 'Hendra Wijaya', phone: '+6281234567896', campaignId: 'CMP-006', campaignName: 'Restock Jaket Hoodie', senderName: 'Support 01', status: 'Pending', scheduledAt: '2026-09-01T10:00:00Z', attempts: 0 },
  { id: 'QU-0010', recipient: 'Rina Wahyuni', phone: '+6281234567897', campaignId: 'CMP-006', campaignName: 'Restock Jaket Hoodie', senderName: 'Support 01', status: 'Cancelled', scheduledAt: '2026-08-29T09:00:00Z', attempts: 0 },
];

const logsBase = [
  ['Budi Santoso', '+6281234567890', 'CMP-001', 'Promo August', 'Delivered', null],
  ['Siti Rahayu', '+6281234567891', 'CMP-001', 'Promo August', 'Read', null],
  ['Ahmad Fauzi', '+6281234567892', 'CMP-001', 'Promo August', 'Delivered', null],
  ['Dewi Lestari', '+6281234567893', 'CMP-001', 'Promo August', 'Read', null],
  ['Rudi Hartono', '+6281234567894', 'CMP-001', 'Promo August', 'Sent', null],
  ['Maya Anggraini', '+6281234567895', 'CMP-001', 'Promo August', 'Read', null],
  ['Eko Susanto', '+6281234567904', 'CMP-001', 'Promo August', 'Failed', 'Phone number is invalid'],
  ['Bambang Sutrisno', '+6281234567916', 'CMP-001', 'Promo August', 'Failed', 'Recipient is blocked'],
  ['Sari Puspita', '+6281234567907', 'CMP-002', 'Payment Reminder', 'Delivered', null],
  ['Rina Wahyuni', '+6281234567897', 'CMP-002', 'Payment Reminder', 'Read', null],
  ['Hendra Wijaya', '+6281234567896', 'CMP-002', 'Payment Reminder', 'Delivered', null],
  ['Joko Prasetyo', '+6281234567898', 'CMP-002', 'Payment Reminder', 'Sent', null],
  ['Fitri Handayani', '+6281234567899', 'CMP-002', 'Payment Reminder', 'Delivered', null],
  ['Andi Saputra', '+6281234567900', 'CMP-002', 'Payment Reminder', 'Read', null],
  ['Bayu Pamungkas', '+6281234567902', 'CMP-003', 'Flash Sale Weekend', 'Pending', null],
  ['Tono Wijoyo', '+6281234567908', 'CMP-003', 'Flash Sale Weekend', 'Pending', null],
  ['Yuni Astuti', '+6281234567905', 'CMP-003', 'Flash Sale Weekend', 'Delivered', null],
  ['Nuraini Safitri', '+6281234567935', 'CMP-003', 'Flash Sale Weekend', 'Sent', null],
  ['Vina Melinda', '+6281234567923', 'CMP-003', 'Flash Sale Weekend', 'Pending', null],
  ['Ratna Sari', '+6281234567909', 'CMP-004', 'Newsletter Q3', 'Delivered', null],
  ['Anisa Fitriani', '+6281234567931', 'CMP-004', 'Newsletter Q3', 'Read', null],
  ['Nadia Safitri', '+6281234567915', 'CMP-004', 'Newsletter Q3', 'Delivered', null],
  ['Mega Utami', '+6281234567937', 'CMP-004', 'Newsletter Q3', 'Sent', null],
  ['Intan Permata', '+6281234567911', 'CMP-005', 'Loyalty Points Promo', 'Read', null],
  ['Citra Kirana', '+6281234567917', 'CMP-005', 'Loyalty Points Promo', 'Delivered', null],
  ['Lestari Kusuma', '+6281234567929', 'CMP-007', 'Winback Campaign', 'Failed', 'Session expired'],
  ['Wahyu Nugraha', '+6281234567936', 'CMP-007', 'Winback Campaign', 'Delivered', null],
  ['Fajar Nugroho', '+6281234567910', 'CMP-007', 'Winback Campaign', 'Read', null],
  ['Dimas Aditya', '+6281234567918', 'CMP-007', 'Winback Campaign', 'Read', null],
  ['Yoga Pratama', '+6281234567924', 'CMP-007', 'Winback Campaign', 'Sent', null],
] as const;

const sampleBodies = [
  'Halo {{name}}, kami punya kabar gembira! Diskon 30%!',
  'Pengingat tagihan: Invoice #INV-2026-001, Rp250.000, jatuh tempo 5 Sep.',
  'FLASH SALE! Diskon hingga 50% hari ini saja!',
  'Berikut berita terbaru dari kami. Produk baru telah hadir!',
  'Anda mendapat poin loyalitas 2x lipat bulan ini.',
];

export const mockMessageLogs: MessageLog[] = logsBase.map((r, i) => {
  const [recipient, phone, campaignId, campaignName, status, error] = r;
  const t = new Date('2026-08-31T08:00:00Z').getTime() - i * 61 * 60 * 1000;
  return {
    id: `LOG-${String(i + 1).padStart(3, '0')}`,
    time: new Date(t).toISOString(),
    recipient,
    phone,
    campaignId,
    campaignName,
    senderName: i % 3 === 0 ? 'Marketing 02' : 'Marketing 01',
    message: sampleBodies[i % sampleBodies.length],
    status: status as MessageLog['status'],
    error,
  };
});

export const mockRecipients = logsBase.map((r, i) => {
  const [name, phone, , , status, error] = r;
  return {
    id: `RCP-${String(i + 1).padStart(3, '0')}`,
    name,
    phone,
    status: status as MessageLog['status'],
    sentAt: status === 'Pending' ? null : new Date(2026, 7, 31, 11, 30 + i, 0).toISOString(),
    error,
  };
});

export const mockTeam: TeamMember[] = [
  { id: 'US-001', name: 'John Prakoso', email: 'admin@blast.io', role: 'Owner', status: 'Active', lastLogin: '2026-08-31T08:00:00Z', avatarColor: 'bg-emerald-500' },
  { id: 'US-002', name: 'Sarah Wijayanti', email: 'sarah@blast.io', role: 'Admin', status: 'Active', lastLogin: '2026-08-31T07:45:00Z', avatarColor: 'bg-sky-500' },
  { id: 'US-003', name: 'Ryan Nugroho', email: 'ryan@blast.io', role: 'Manager', status: 'Active', lastLogin: '2026-08-30T16:20:00Z', avatarColor: 'bg-violet-500' },
  { id: 'US-004', name: 'Dita Prameswari', email: 'dita@blast.io', role: 'Operator', status: 'Active', lastLogin: '2026-08-30T12:10:00Z', avatarColor: 'bg-amber-500' },
  { id: 'US-005', name: 'Agus Salim', email: 'agus@blast.io', role: 'Operator', status: 'Invited', lastLogin: null, avatarColor: 'bg-rose-500' },
  { id: 'US-006', name: 'Maya Lestari', email: 'maya@blast.io', role: 'Viewer', status: 'Disabled', lastLogin: '2026-07-15T09:00:00Z', avatarColor: 'bg-teal-500' },
];

export const mockActivity: ActivityLog[] = [
  { id: 'ACT-001', user: 'John Prakoso', action: 'created campaign "Promo August"', module: 'Campaign', date: '2026-08-31T08:10:00Z' },
  { id: 'ACT-002', user: 'Dita Prameswari', action: 'imported 1,500 contacts', module: 'Contact', date: '2026-08-31T07:50:00Z' },
  { id: 'ACT-003', user: 'Sarah Wijayanti', action: 'edited template "Payment Reminder"', module: 'Template', date: '2026-08-31T07:20:00Z' },
  { id: 'ACT-004', user: 'Ryan Nugroho', action: 'paused campaign "Bandung Fashion Week"', module: 'Campaign', date: '2026-08-30T16:00:00Z' },
  { id: 'ACT-005', user: 'System', action: 'campaign "Promo August" completed', module: 'Campaign', date: '2026-08-31T07:00:00Z' },
  { id: 'ACT-006', user: 'Sarah Wijayanti', action: 'invited agus@blast.io to join the team', module: 'Team', date: '2026-08-30T10:30:00Z' },
  { id: 'ACT-007', user: 'John Prakoso', action: 'updated WhatsApp account "Support 01"', module: 'WhatsApp', date: '2026-08-30T09:15:00Z' },
  { id: 'ACT-008', user: 'Dita Prameswari', action: 'exported campaign report "Promo August"', module: 'Campaign', date: '2026-08-29T14:40:00Z' },
  { id: 'ACT-009', user: 'John Prakoso', action: 'changed application theme settings', module: 'Settings', date: '2026-08-29T11:00:00Z' },
  { id: 'ACT-010', user: 'Ryan Nugroho', action: 'created group "Wholesale"', module: 'Contact', date: '2026-08-28T15:20:00Z' },
  { id: 'ACT-011', user: 'Sarah Wijayanti', action: 'deleted template "Old Promo 2025"', module: 'Template', date: '2026-08-28T10:10:00Z' },
  { id: 'ACT-012', user: 'System', action: 'WhatsApp account "Support 01" encountered an error', module: 'WhatsApp', date: '2026-08-30T22:14:00Z' },
  { id: 'ACT-013', user: 'John Prakoso', action: 'scheduled campaign "Restock Jaket Hoodie"', module: 'Campaign', date: '2026-08-28T14:30:00Z' },
  { id: 'ACT-014', user: 'Dita Prameswari', action: 'bulk-assigned 320 contacts to "Jakarta"', module: 'Contact', date: '2026-08-27T13:00:00Z' },
  { id: 'ACT-015', user: 'Ryan Nugroho', action: 'resumed campaign "Flash Sale Weekend"', module: 'Campaign', date: '2026-08-31T11:50:00Z' },
  { id: 'ACT-016', user: 'Sarah Wijayanti', action: 'disabled user "maya@blast.io"', module: 'Team', date: '2026-08-26T09:30:00Z' },
  { id: 'ACT-017', user: 'John Prakoso', action: 'exported contacts CSV', module: 'Contact', date: '2026-08-25T16:20:00Z' },
  { id: 'ACT-018', user: 'System', action: 'scheduled nightly database backup completed', module: 'Settings', date: '2026-08-25T02:00:00Z' },
  { id: 'ACT-019', user: 'Dita Prameswari', action: 'created campaign "Autumn Preview"', module: 'Campaign', date: '2026-08-28T15:15:00Z' },
  { id: 'ACT-020', user: 'Sarah Wijayanti', action: 'updated notification preferences', module: 'Settings', date: '2026-08-24T11:40:00Z' },
];

export const mockNotifications: AppNotification[] = [
  { id: 'NT-001', type: 'Success', title: 'Campaign completed', message: 'Campaign "Promo August" completed successfully.', time: '2026-08-31T07:00:00Z', read: false },
  { id: 'NT-002', type: 'Warning', title: 'Low WhatsApp balance', message: 'Your message quota is almost exhausted.', time: '2026-08-31T06:40:00Z', read: false },
  { id: 'NT-003', type: 'Error', title: 'Connection error', message: 'WhatsApp account "Support 01" encountered an error.', time: '2026-08-30T22:14:00Z', read: false },
  { id: 'NT-004', type: 'Info', title: 'New team member added', message: 'Agus joined your team.', time: '2026-08-30T10:30:00Z', read: true },
  { id: 'NT-005', type: 'Success', title: 'Import finished', message: '1,500 contacts imported successfully.', time: '2026-08-31T07:50:00Z', read: false },
];