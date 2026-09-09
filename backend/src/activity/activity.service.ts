import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(module?: string) {
    const where = module ? { module } : {};

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    });

    return {
      data: logs.map((l) => ({
        id: `ACT-${String(l.id).padStart(3, '0')}`,
        user: l.user,
        action: l.action,
        module: l.module,
        date: l.date.toISOString(),
      })),
    };
  }

  async log(user: string, action: string, module: string) {
    const entry = await this.prisma.activityLog.create({
      data: { user, action, module },
    });

    return entry;
  }
}
