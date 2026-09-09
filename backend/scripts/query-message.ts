import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const url = process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/wa_blast';
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

const id = process.argv[2];
const rows = await prisma.$queryRawUnsafe(
  'SELECT id, status, attempts, maxAttempts, scheduledAt, processingStartedAt, updatedAt FROM whatsapp_messages WHERE id = ?',
  id,
);
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();