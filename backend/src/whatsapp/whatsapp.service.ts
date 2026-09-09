import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import {
  WhatsAppAccountStatus,
  type Prisma,
  type WhatsAppAccount,
} from '../generated/prisma/client.js';
import {
  buildPaginationEnvelope,
  formatDateTime,
} from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWhatsAppAccountDto } from './dto/create-whatsapp-account.dto.js';
import { QueryWhatsAppAccountsDto } from './dto/query-whatsapp-accounts.dto.js';
import { UpdateWhatsAppAccountDto } from './dto/update-whatsapp-account.dto.js';

const SORTABLE = [
  'name',
  'status',
  'is_default',
  'last_connected_at',
  'last_disconnected_at',
  'created_at',
  'updated_at',
];

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;

export interface WhatsAppAccountResource {
  id: string;
  name: string;
  phone: string | null;
  status: WhatsAppAccountStatus;
  is_default: boolean;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Database-only CRUD for WhatsApp accounts. Connection/socket concerns stay
 * in WhatsAppManager; this service never touches Baileys.
 */
@Injectable()
export class WhatsAppService {
  constructor(private readonly prisma: PrismaService) {}

  async list(req: Request, params: QueryWhatsAppAccountsDto) {
    const where = this.buildWhere(params);
    const orderBy = this.buildOrderBy(params);
    const perPage = this.parsePerPage(params.per_page);
    const page = this.parsePage(params.page);

    const [total, items] = await Promise.all([
      this.prisma.whatsAppAccount.count({ where }),
      this.prisma.whatsAppAccount.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return buildPaginationEnvelope(req, {
      data: items.map((item) => this.toResource(item)),
      total,
      perPage,
      page,
    });
  }

  async create(dto: CreateWhatsAppAccountDto) {
    const account = await this.prisma.whatsAppAccount.create({
      data: {
        name: dto.name,
        status: WhatsAppAccountStatus.DISCONNECTED,
      },
    });

    return { data: this.toResource(account) };
  }

  async findOne(id: string) {
    const account = await this.getRawOrThrow(id);
    return { data: this.toResource(account) };
  }

  async update(id: string, dto: UpdateWhatsAppAccountDto) {
    await this.getRawOrThrow(id);

    const updateData: Prisma.WhatsAppAccountUpdateInput = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.isDefault === true) {
      await this.prisma.$transaction([
        this.prisma.whatsAppAccount.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        }),
        this.prisma.whatsAppAccount.update({
          where: { id },
          data: { ...updateData, isDefault: true },
        }),
      ]);
    } else {
      if (dto.isDefault === false) {
        updateData.isDefault = false;
      }
      if (Object.keys(updateData).length > 0) {
        await this.prisma.whatsAppAccount.update({
          where: { id },
          data: updateData,
        });
      }
    }

    return this.findOne(id);
  }

  async setDefault(id: string) {
    await this.getRawOrThrow(id);

    await this.prisma.$transaction([
      this.prisma.whatsAppAccount.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      }),
      this.prisma.whatsAppAccount.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.prisma.whatsAppAccount.deleteMany({
        where: { id },
      });

      if (result.count === 0) {
        throw new NotFoundException({ message: 'Not Found' });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const code = (error as { code?: string } | null)?.code;
      if (code === 'P2003') {
        throw new ConflictException({
          message: 'Unable to delete account. It is referenced by one or more campaigns.',
        });
      }
      throw error;
    }
  }

  /**
   * Resolve an account by id, used by the manager before opening a socket.
   */
  async getRawOrThrow(id: string): Promise<WhatsAppAccount> {
    const account = await this.prisma.whatsAppAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return account;
  }

  async ensureExists(id: string): Promise<void> {
    await this.getRawOrThrow(id);
  }

  /**
   * Accounts eligible for auto-restore after a backend restart. These are
   * accounts that were actively connected (or mid-connection) when the
   * process stopped, so their session files likely still exist on disk.
   * Explicitly DISCONNECTED / LOGGED_OUT rows are excluded: the user chose to
   * stop that account, so it must not silently come back on top of WhatsApp.
   */
  async findRestorableAccounts(): Promise<WhatsAppAccount[]> {
    return this.prisma.whatsAppAccount.findMany({
      where: {
        status: {
          in: [WhatsAppAccountStatus.CONNECTED, WhatsAppAccountStatus.CONNECTING],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Reset an account to DISCONNECTED on the wiring pass during auto-restore,
   * so a row left as CONNECTED by a previous process is reconciled before we
   * attempt to open a fresh socket for it.
   */
  async markDisconnected(accountId: string): Promise<void> {
    await this.prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: {
        status: WhatsAppAccountStatus.DISCONNECTED,
        lastDisconnectedAt: new Date(),
      },
    });
  }

  /**
   * Persist a status transition that originates from the manager (connect,
   * open, close, logout). Keeps the DB row as the source of truth.
   */
  async persistStatus(
    id: string,
    status: WhatsAppAccountStatus,
    meta?: {
      phone?: string | null;
      connectedAt?: boolean;
      disconnectedAt?: boolean;
    },
  ): Promise<void> {
    const data: Prisma.WhatsAppAccountUpdateInput = { status };

    if (meta?.phone !== undefined) {
      data.phone = meta.phone;
    }
    if (meta?.connectedAt) {
      data.lastConnectedAt = new Date();
    }
    if (meta?.disconnectedAt) {
      data.lastDisconnectedAt = new Date();
    }

    await this.prisma.whatsAppAccount.update({ where: { id }, data });
  }

  private buildWhere(params: QueryWhatsAppAccountsDto): Prisma.WhatsAppAccountWhereInput {
    const where: Prisma.WhatsAppAccountWhereInput = {};

    const search = String(params.search ?? '').trim();
    if (search !== '') {
      where.OR = [{ name: { contains: search } }];
    }

    return where;
  }

  private buildOrderBy(
    params: QueryWhatsAppAccountsDto,
  ): Prisma.WhatsAppAccountOrderByWithRelationInput {
    const mapped: Record<string, string> = {
      is_default: 'isDefault',
      last_connected_at: 'lastConnectedAt',
      last_disconnected_at: 'lastDisconnectedAt',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    };

    const key = String(params.sort_by ?? '');
    const field = SORTABLE.includes(key) ? (mapped[key] ?? key) : 'createdAt';
    const direction = String(params.sort_direction ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    return { [field]: direction } as Prisma.WhatsAppAccountOrderByWithRelationInput;
  }

  private parsePerPage(raw: string | undefined): number {
    let perPage = DEFAULT_PER_PAGE;

    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = parseInt(String(raw), 10);
      perPage = Number.isNaN(parsed) ? 0 : parsed;
    }

    if (perPage < 1) {
      perPage = DEFAULT_PER_PAGE;
    }

    return Math.min(perPage, MAX_PER_PAGE);
  }

  private parsePage(raw: string | undefined): number {
    if (raw === undefined || raw === null || raw === '') {
      return 1;
    }

    const parsed = parseInt(String(raw), 10);

    if (Number.isNaN(parsed) || parsed < 1) {
      return 1;
    }

    return parsed;
  }

  private toResource(account: WhatsAppAccount): WhatsAppAccountResource {
    return {
      id: account.id,
      name: account.name,
      phone: account.phone,
      status: account.status,
      is_default: account.isDefault,
      last_connected_at: formatDateTime(account.lastConnectedAt),
      last_disconnected_at: formatDateTime(account.lastDisconnectedAt),
      created_at: formatDateTime(account.createdAt),
      updated_at: formatDateTime(account.updatedAt),
    };
  }
}