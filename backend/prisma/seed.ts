import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main() {
  const url = process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/wa_blast';

  const adapter = new PrismaMariaDb(url);
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('password', 10);

  const users = [
    {
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password,
      role: 'superadmin',
    },
    {
      name: 'Admin',
      email: 'admin@example.com',
      password,
      role: 'admin',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, password: user.password, role: user.role },
      create: user,
    });
  }

  const teamMembers = [
    { name: 'John Prakoso', email: 'john@blast.io', role: 'superadmin', status: 'Active', lastLogin: new Date('2026-08-31T08:00:00Z') },
    { name: 'Sarah Wijayanti', email: 'sarah@blast.io', role: 'admin', status: 'Active', lastLogin: new Date('2026-08-31T07:45:00Z') },
    { name: 'Ryan Nugroho', email: 'ryan@blast.io', role: 'manager', status: 'Active', lastLogin: new Date('2026-08-30T16:20:00Z') },
    { name: 'Dita Prameswari', email: 'dita@blast.io', role: 'operator', status: 'Active', lastLogin: new Date('2026-08-30T12:10:00Z') },
    { name: 'Agus Salim', email: 'agus@blast.io', role: 'operator', status: 'Invited', lastLogin: null },
    { name: 'Maya Lestari', email: 'maya@blast.io', role: 'viewer', status: 'Disabled', lastLogin: new Date('2026-07-15T09:00:00Z') },
  ];

  for (const member of teamMembers) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, role: member.role, status: member.status, lastLogin: member.lastLogin },
      create: { ...member, password },
    });
  }

  const activities = [
    { user: 'John Prakoso', action: 'created campaign "Promo August"', module: 'Campaign', date: new Date('2026-08-31T08:10:00Z') },
    { user: 'Dita Prameswari', action: 'imported 1,500 contacts', module: 'Contact', date: new Date('2026-08-31T07:50:00Z') },
    { user: 'Sarah Wijayanti', action: 'edited template "Payment Reminder"', module: 'Template', date: new Date('2026-08-31T07:20:00Z') },
    { user: 'Ryan Nugroho', action: 'paused campaign "Bandung Fashion Week"', module: 'Campaign', date: new Date('2026-08-30T16:00:00Z') },
    { user: 'System', action: 'campaign "Promo August" completed', module: 'Campaign', date: new Date('2026-08-31T07:00:00Z') },
    { user: 'Sarah Wijayanti', action: 'invited agus@blast.io to join the team', module: 'Team', date: new Date('2026-08-30T10:30:00Z') },
    { user: 'John Prakoso', action: 'updated WhatsApp account "Support 01"', module: 'WhatsApp', date: new Date('2026-08-30T09:15:00Z') },
    { user: 'John Prakoso', action: 'changed application theme settings', module: 'Settings', date: new Date('2026-08-29T11:00:00Z') },
  ];

  await prisma.activityLog.deleteMany();
  for (const activity of activities) {
    await prisma.activityLog.create({ data: activity });
  }

  console.log('Seeded users:', users.map((u) => u.email).join(', '));
  console.log('Seeded team members:', teamMembers.map((t) => t.email).join(', '));
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });