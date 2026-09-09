import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '../generated/prisma/client.js';
import { buildPaginationEnvelope, formatDateTime } from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactsDto } from './dto/query-contacts.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

const CONTACT_INCLUDE = {
  groups: {
    include: { group: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ContactInclude;

type ContactWithGroups = Prisma.ContactGetPayload<{
  include: typeof CONTACT_INCLUDE;
}>;

@Injectable()
export class ContactsService {
  private readonly SORTABLE = [
    'name',
    'idpel',
    'phone',
    'email',
    'customer_type',
    'region',
    'ulp',
    'last_contact_at',
    'created_at',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async list(req: Request, params: QueryContactsDto) {
    const where = this.buildWhere(params);
    const orderBy = this.buildOrderBy(params);
    const perPage = this.parsePerPage(params);
    const page = this.parsePage(params);

    const [total, items] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: CONTACT_INCLUDE,
      }),
    ]);

    const data = items.map((contact) => this.toContactResource(contact));

    return buildPaginationEnvelope(req, { data, total, perPage, page });
  }

  async create(dto: CreateContactDto) {
    const groupIds = this.dedupe(dto.group_ids ?? []);

    await this.assertIdpelUnique(dto.idpel, null);
    await this.assertGroupsExist(groupIds);

    try {
      const contact = await this.prisma.$transaction(async (tx) => {
        const created = await tx.contact.create({
          data: {
            idpel: dto.idpel,
            name: dto.name,
            phone: dto.phone,
            email: dto.email,
            customer_type: dto.customer_type,
            tariff: dto.tariff,
            power: dto.power,
            region: dto.region,
            ulp: dto.ulp,
            last_contact_at: this.toDateOrNull(dto.last_contact_at),
          },
        });

        if (groupIds.length > 0) {
          await tx.contactGroup.createMany({
            data: groupIds.map((groupId) => ({
              contact_id: created.id,
              group_id: groupId,
            })),
          });
        }

        return tx.contact.findUniqueOrThrow({
          where: { id: created.id },
          include: CONTACT_INCLUDE,
        });
      });

      return { data: this.toContactResource(contact) };
    } catch (error) {
      throw this.translatePrismaError(error);
    }
  }

  async findOne(id: string) {
    const numericId = this.parseId(id);

    if (numericId === null || numericId === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const contact = await this.prisma.contact.findUnique({
      where: { id: numericId },
      include: CONTACT_INCLUDE,
    });

    if (!contact) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return { data: this.toContactResource(contact) };
  }

  async update(id: string, dto: UpdateContactDto) {
    const numericId = this.parseId(id);

    if (numericId === null || numericId === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    await this.assertIdpelUnique(dto.idpel, numericId);

    const groupIds = this.dedupe(dto.group_ids ?? []);
    if (dto.group_ids !== undefined) {
      await this.assertGroupsExist(groupIds);
    }

    try {
      const contact = await this.prisma.$transaction(async (tx) => {
        await tx.contact.update({
          where: { id: numericId },
          data: this.buildUpdateData(dto),
        });

        if (dto.group_ids !== undefined) {
          await tx.contactGroup.deleteMany({
            where: { contact_id: numericId },
          });

          if (groupIds.length > 0) {
            await tx.contactGroup.createMany({
              data: groupIds.map((groupId) => ({
                contact_id: numericId,
                group_id: groupId,
              })),
            });
          }
        }

        return tx.contact.findUniqueOrThrow({
          where: { id: numericId },
          include: CONTACT_INCLUDE,
        });
      });

      return { data: this.toContactResource(contact) };
    } catch (error) {
      throw this.translatePrismaError(error);
    }
  }

  async remove(id: string) {
    const numericId = this.parseId(id);

    if (numericId === null || numericId === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contactGroup.deleteMany({ where: { contact_id: numericId } });

        const result = await tx.contact.deleteMany({ where: { id: numericId } });

        if (result.count === 0) {
          throw new NotFoundException({ message: 'Not Found' });
        }
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw this.translatePrismaError(error);
    }
  }

  private buildUpdateData(dto: UpdateContactDto): Prisma.ContactUpdateInput {
    const data: Prisma.ContactUpdateInput = {};

    if (dto.idpel !== undefined) {
      data.idpel = dto.idpel ?? '';
    }
    if (dto.name !== undefined) {
      data.name = dto.name ?? '';
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone ?? '';
    }
    if (dto.email !== undefined) {
      data.email = dto.email;
    }
    if (dto.customer_type !== undefined) {
      data.customer_type = dto.customer_type;
    }
    if (dto.tariff !== undefined) {
      data.tariff = dto.tariff;
    }
    if (dto.power !== undefined) {
      data.power = dto.power;
    }
    if (dto.region !== undefined) {
      data.region = dto.region;
    }
    if (dto.ulp !== undefined) {
      data.ulp = dto.ulp;
    }
    if (dto.last_contact_at !== undefined) {
      data.last_contact_at = this.toDateOrNull(dto.last_contact_at);
    }

    return data;
  }

  private toDateOrNull(value: string | number | null): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private buildWhere(params: QueryContactsDto): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = {};

    const search = (params.search ?? '').toString().trim();

    if (search !== '') {
      where.OR = [
        { name: { contains: search } },
        { idpel: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    for (const field of ['customer_type', 'tariff', 'region', 'ulp'] as const) {
      const value = params[field];

      if (value !== undefined && value !== null && value !== '') {
        where[field] = String(value);
      }
    }

    if (params.power !== undefined && params.power !== null && params.power !== '') {
      const parsed = parseInt(String(params.power), 10);

      where.power = Number.isNaN(parsed) ? 0 : parsed;
    }

    if (params.group_id !== undefined && params.group_id !== null && params.group_id !== '') {
      const parsed = parseInt(String(params.group_id), 10);

      where.groups = {
        some: { group_id: Number.isNaN(parsed) ? -1 : parsed },
      };
    }

    return where;
  }

  private buildOrderBy(params: QueryContactsDto): Prisma.ContactOrderByWithRelationInput {
    const field = this.SORTABLE.includes(params.sort_by ?? '')
      ? (params.sort_by as string)
      : 'created_at';

    const direction =
      String(params.sort_direction ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    return { [field]: direction } as Prisma.ContactOrderByWithRelationInput;
  }

  private parsePerPage(params: QueryContactsDto): number {
    let perPage = 10;

    if (params.per_page !== undefined && params.per_page !== null && params.per_page !== '') {
      const parsed = parseInt(String(params.per_page), 10);

      perPage = Number.isNaN(parsed) ? 0 : parsed;
    }

    if (perPage < 1) {
      perPage = 1;
    }

    return Math.min(perPage, 100);
  }

  private parsePage(params: QueryContactsDto): number {
    if (params.page === undefined || params.page === null || params.page === '') {
      return 1;
    }

    const parsed = parseInt(String(params.page), 10);

    if (Number.isNaN(parsed) || parsed < 1) {
      return 1;
    }

    return parsed;
  }

  private parseId(id: string): number | null {
    const parsed = Number(id);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }

  private async assertIdpelUnique(idpel: string | undefined, ignoringId: number | null): Promise<void> {
    if (idpel === undefined) {
      return;
    }

    const existing = await this.prisma.contact.findFirst({
      where: {
        idpel,
        ...(ignoringId !== null ? { id: { not: ignoringId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      this.throwIdpelTaken();
    }
  }

  private async assertGroupsExist(ids: number[]): Promise<void> {
    for (const id of new Set(ids)) {
      const group = await this.prisma.group.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!group) {
        throw new UnprocessableEntityException({
          message: 'The selected group ids is invalid.',
          errors: {
            [`group_ids.${ids.indexOf(id)}`]: ['The selected group ids is invalid.'],
          },
        });
      }
    }
  }

  private throwIdpelTaken(): never {
    throw new UnprocessableEntityException({
      message: 'The idpel has already been taken.',
      errors: {
        idpel: ['The idpel has already been taken.'],
      },
    });
  }

  /**
   * Maps known Prisma errors to Laravel-style validation responses so no
   * internal database error leaks to the client.
   */
  private translatePrismaError(error: unknown): unknown {
    const code = (error as { code?: string } | null)?.code;

    if (code === 'P2002') {
      return this.throwIdpelTaken();
    }

    if (code === 'P2003') {
      throw new UnprocessableEntityException({
        message: 'The selected group ids is invalid.',
        errors: {
          group_ids: ['The selected group ids is invalid.'],
        },
      });
    }

    return error;
  }

  private dedupe(ids: number[]): number[] {
    return [...new Set(ids)];
  }

  private toContactResource(contact: ContactWithGroups) {
    return {
      id: contact.id,
      idpel: contact.idpel,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      customer_type: contact.customer_type,
      tariff: contact.tariff,
      power: contact.power,
      region: contact.region,
      ulp: contact.ulp,
      last_contact_at: formatDateTime(contact.last_contact_at),
      groups: contact.groups.map((pivot) => ({
        id: pivot.group.id,
        name: pivot.group.name,
        slug: pivot.group.slug,
        description: pivot.group.description,
        created_at: formatDateTime(pivot.group.created_at),
        updated_at: formatDateTime(pivot.group.updated_at),
      })),
      created_at: formatDateTime(contact.created_at),
      updated_at: formatDateTime(contact.updated_at),
    };
  }
}