import type { Campaign } from '@/types';

const msgPromo =
  'Halo {{name}},\n\nKami punya kabar gembira! Dapatkan diskon 30% untuk semua produk selama bulan Agustus. Gunakan kode PROMO30 sebelum 31 Agustus.\n\nTerima kasih,\nTim Marketing';

const msgInvoice =
  'Halo {{name}},\n\nPengingat tagihan:\nInvoice #{{invoice}}\nJumlah: Rp{{amount}}\nJatuh tempo: {{due_date}}\n\nMohon lakukan pembayaran sebelum jatuh tempo.\n\nTerima kasih.';

const msgFlash =
  'Halo {{name}}! 🔥\n\nFLASH SALE 2 JAM! Diskon hingga 50% hanya hari ini. Jangan sampai ketinggalan!\n\nKlik untuk melihat katalog terbaru kami.';

const msgNews =
  'Halo {{name}},\n\nBerikut berita terbaru dari kami. Produk baru telah hadir dan menunggu Anda!\n\nSalam hangat,\nTeam {{company}}';

const msgLoyalty =
  'Halo {{name}},\n\nTerima kasih sudah menjadi pelanggan setia! Anda mendapatkan poin loyalitas 2x lipat bulan ini.\n\nSalam,\nTim {{company}}';

export const mockCampaigns: Campaign[] = [
  {
    id: 'CMP-001', name: 'Promo August', description: 'Diskon 30% untuk seluruh produk bulan Agustus.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 2450, sent: 2450, delivered: 2370, read: 2120, failed: 80,
    status: 'Completed', scheduledAt: '2026-08-31T19:00:00Z', message: msgPromo, mediaType: 'image', mediaName: 'promo-august.jpg',
    createdAt: '2026-07-20T09:00:00Z', groupIds: ['GRP-001', 'GRP-003'], progress: 100,
  },
  {
    id: 'CMP-002', name: 'Payment Reminder', description: 'Pengingat tagihan untuk invoice jatuh tempo.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 1480, sent: 1480, delivered: 1435, read: 1298, failed: 45,
    status: 'Completed', scheduledAt: '2026-08-27T08:00:00Z', message: msgInvoice, mediaType: 'none',
    createdAt: '2026-07-28T08:00:00Z', groupIds: ['GRP-001'], progress: 100,
  },
  {
    id: 'CMP-003', name: 'Flash Sale Weekend', description: 'Flash sale akhir pekan diskon 50%.',
    senderId: 'WA-002', senderName: 'Marketing 02', recipients: 3200, sent: 2600, delivered: 2505, read: 2400, failed: 95,
    status: 'Running', scheduledAt: '2026-08-31T12:00:00Z', message: msgFlash, mediaType: 'image', mediaName: 'flash-sale.png',
    createdAt: '2026-08-20T10:00:00Z', groupIds: ['GRP-001', 'GRP-003', 'GRP-007'], progress: 81,
  },
  {
    id: 'CMP-004', name: 'Newsletter Q3', description: 'Newsletter kuartal ketiga untuk subscriber.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 875, sent: 875, delivered: 840, read: 720, failed: 35,
    status: 'Completed', scheduledAt: '2026-08-15T09:00:00Z', message: msgNews, mediaType: 'none',
    createdAt: '2026-08-01T09:00:00Z', groupIds: ['GRP-007'], progress: 100,
  },
  {
    id: 'CMP-005', name: 'Loyalty Points Promo', description: 'Poin loyalitas ganda untuk VIP.',
    senderId: 'WA-002', senderName: 'Marketing 02', recipients: 620, sent: 620, delivered: 610, read: 580, failed: 10,
    status: 'Completed', scheduledAt: '2026-08-12T10:00:00Z', message: msgLoyalty, mediaType: 'none',
    createdAt: '2026-08-03T10:00:00Z', groupIds: ['GRP-002'], progress: 100,
  },
  {
    id: 'CMP-006', name: 'Restock Jaket Hoodie', description: 'Kabar produk hoodie kembali tersedia.',
    senderId: 'WA-003', senderName: 'Support 01', recipients: 1950, sent: 0, delivered: 0, read: 0, failed: 0,
    status: 'Scheduled', scheduledAt: '2026-09-01T10:00:00Z', message: msgPromo, mediaType: 'image', mediaName: 'hoodie.jpg',
    createdAt: '2026-08-28T14:00:00Z', groupIds: ['GRP-003', 'GRP-005'], progress: 0,
  },
  {
    id: 'CMP-007', name: 'Winback Campaign', description: 'Reactivate inactive customers dengan voucher.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 892, sent: 892, delivered: 850, read: 610, failed: 42,
    status: 'Completed', scheduledAt: '2026-08-08T11:00:00Z', message: msgFlash, mediaType: 'none',
    createdAt: '2026-07-30T08:00:00Z', groupIds: ['GRP-006'], progress: 100,
  },
  {
    id: 'CMP-008', name: 'Surabaya Grand Opening', description: 'Pembukaan cabang baru Surabaya.',
    senderId: 'WA-003', senderName: 'Support 01', recipients: 430, sent: 430, delivered: 410, read: 380, failed: 20,
    status: 'Completed', scheduledAt: '2026-08-05T09:30:00Z', message: msgNews, mediaType: 'none',
    createdAt: '2026-07-25T08:00:00Z', groupIds: ['GRP-004'], progress: 100,
  },
  {
    id: 'CMP-009', name: 'Bandung Fashion Week', description: 'Kolaborasi dengan event fashion Bandung.',
    senderId: 'WA-002', senderName: 'Marketing 02', recipients: 760, sent: 500, delivered: 490, read: 400, failed: 10,
    status: 'Paused', scheduledAt: '2026-08-30T10:00:00Z', message: msgPromo, mediaType: 'video', mediaName: 'fashion-week.mp4',
    createdAt: '2026-08-18T09:00:00Z', groupIds: ['GRP-005'], progress: 66,
  },
  {
    id: 'CMP-010', name: 'Raya Promo Berbuka', description: 'Promo spesial bulan ramadhan.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 2100, sent: 2100, delivered: 2030, read: 1750, failed: 70,
    status: 'Completed', scheduledAt: '2026-07-10T18:00:00Z', message: msgPromo, mediaType: 'image', mediaName: 'ramadhan.jpg',
    createdAt: '2026-06-25T08:00:00Z', groupIds: ['GRP-001', 'GRP-003', 'GRP-004'], progress: 100,
  },
  {
    id: 'CMP-011', name: 'Price Drop Kaos', description: 'Penurunan harga produk kaos.',
    senderId: 'WA-002', senderName: 'Marketing 02', recipients: 3100, sent: 3100, delivered: 3050, read: 2800, failed: 50,
    status: 'Completed', scheduledAt: '2026-07-22T14:00:00Z', message: msgFlash, mediaType: 'none',
    createdAt: '2026-07-15T08:00:00Z', groupIds: ['GRP-001', 'GRP-007'], progress: 100,
  },
  {
    id: 'CMP-012', name: 'B2B Catalog Q3', description: 'Katalog baru untuk partner wholesale.',
    senderId: 'WA-003', senderName: 'Support 01', recipients: 540, sent: 0, delivered: 0, read: 0, failed: 0,
    status: 'Draft', scheduledAt: null, message: msgNews, mediaType: 'document', mediaName: 'catalog-q3.pdf',
    createdAt: '2026-08-29T07:00:00Z', groupIds: ['GRP-008'], progress: 0,
  },
  {
    id: 'CMP-013', name: 'Mid Year Sale', description: 'Sale akhir semester.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 5400, sent: 5400, delivered: 5210, read: 4600, failed: 190,
    status: 'Completed', scheduledAt: '2026-06-30T10:00:00Z', message: msgPromo, mediaType: 'image', mediaName: 'midyear.jpg',
    createdAt: '2026-06-10T08:00:00Z', groupIds: ['GRP-001', 'GRP-003', 'GRP-004', 'GRP-005'], progress: 100,
  },
  {
    id: 'CMP-014', name: 'OTP Auth Test', description: 'Test template autentikasi.',
    senderId: 'WA-003', senderName: 'Support 01', recipients: 250, sent: 250, delivered: 248, read: 245, failed: 2,
    status: 'Completed', scheduledAt: '2026-08-01T08:00:00Z', message: 'Kode OTP Anda adalah 123456. Jangan bagikan ke siapa pun.',
    mediaType: 'none', createdAt: '2026-07-31T08:00:00Z', groupIds: ['GRP-001'], progress: 100,
  },
  {
    id: 'CMP-015', name: 'Voucher Birthday', description: 'Voucher ulang tahun pelanggan.',
    senderId: 'WA-002', senderName: 'Marketing 02', recipients: 118, sent: 118, delivered: 116, read: 112, failed: 2,
    status: 'Completed', scheduledAt: '2026-08-03T09:00:00Z', message: msgLoyalty, mediaType: 'none',
    createdAt: '2026-07-20T08:00:00Z', groupIds: ['GRP-002', 'GRP-001'], progress: 100,
  },
  {
    id: 'CMP-016', name: 'Survey Kepuasan', description: 'Survey kepuasan pelanggan Q3.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 760, sent: 760, delivered: 730, read: 520, failed: 30,
    status: 'Completed', scheduledAt: '2026-08-20T13:00:00Z', message: msgNews, mediaType: 'none',
    createdAt: '2026-08-10T08:00:00Z', groupIds: ['GRP-001'], progress: 100,
  },
  {
    id: 'CMP-017', name: 'Lebaran Sale', description: 'Promo lebaran untuk semua pelanggan.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 6800, sent: 6800, delivered: 6550, read: 5900, failed: 250,
    status: 'Completed', scheduledAt: '2026-06-01T12:00:00Z', message: msgPromo, mediaType: 'image', mediaName: 'lebaran.png',
    createdAt: '2026-05-20T08:00:00Z', groupIds: ['GRP-001', 'GRP-003', 'GRP-004', 'GRP-005'], progress: 100,
  },
  {
    id: 'CMP-018', name: 'Autumn Preview', description: 'Pra-peluncuran koleksi musim gugur.',
    senderId: 'WA-003', senderName: 'Support 01', recipients: 1480, sent: 0, delivered: 0, read: 0, failed: 0,
    status: 'Scheduled', scheduledAt: '2026-09-05T09:00:00Z', message: msgNews, mediaType: 'video', mediaName: 'autumn.mp4',
    createdAt: '2026-08-28T15:00:00Z', groupIds: ['GRP-007', 'GRP-002'], progress: 0,
  },
  {
    id: 'CMP-019', name: 'Pengumuman Maintenance', description: 'Info maintenance aplikasi.',
    senderId: 'WA-003', senderName: 'Support 01', recipients: 120, sent: 120, delivered: 118, read: 115, failed: 2,
    status: 'Completed', scheduledAt: '2026-08-22T07:00:00Z', message: 'Kami sedang melakukan maintenance. Mohon maaf atas ketidaknyamanannya.',
    mediaType: 'none', createdAt: '2026-08-21T08:00:00Z', groupIds: ['GRP-001'], progress: 100,
  },
  {
    id: 'CMP-020', name: 'Eid Mubarak Greeting', description: 'Ucapan hari raya Idul Fitri.',
    senderId: 'WA-001', senderName: 'Marketing 01', recipients: 7200, sent: 7200, delivered: 6900, read: 6300, failed: 300,
    status: 'Completed', scheduledAt: '2026-04-05T06:00:00Z', message: 'Selamat Hari Raya Idul Fitri! Mohon maaf lahir dan batin.',
    mediaType: 'image', mediaName: 'eid.jpg', createdAt: '2026-03-30T08:00:00Z', groupIds: ['GRP-001', 'GRP-003', 'GRP-004', 'GRP-005', 'GRP-007'], progress: 100,
  },
];