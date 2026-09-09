import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, WhatsAppMessageStatus } from '../src/generated/prisma/client.js';

const url = process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/wa_blast';
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

const cutoff = new Date(Date.now() - 300_000);
console.log('cutoff(before):', cutoff.toISOString());

const result = await prisma.whatsAppMessage.updateMany({
  where: {
    status: WhatsAppMessageStatus.PROCESSING,
    processingStartedAt: { lt: cutoff },
  },
  data: {
    status: WhatsAppMessageStatus.PENDING,
    attempts: { increment: 1 },
    processingStartedAt: null,
    scheduledAt: new Date(),
    lastError: 'processing_timeout',
  },
});
console.log('rows updated:', result.count);
await prisma.$disconnect();