import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '../generated/prisma/client.js';
import { buildPaginationEnvelope, formatDateTime } from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignContactsDto } from './dto/assign-contacts.dto.js';
import { StoreGroupDto } from './dto/store-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';

const SORTABLE = ['name', 'slug', 'created_at', 'contacts_count'];
const DEFAULT_PER_PAGE = 20;

const GROUP_COUNT_INCLUDE = {
  _count: { select: { contacts: true } },
} satisfies Prisma.GroupInclude;

type GroupWithCount = Prisma.GroupGetPayload<{
  include: typeof GROUP_COUNT_INCLUDE;
}>;

interface GroupBase {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

type GroupLike = GroupBase & { _count?: { contacts?: number } };

/**
 * Mirrors Laravel's Str::slug(): lowercase, non-alphanumeric runs become a
 * single '-' separator, leading/trailing separators stripped.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(req: Request, params: Record<string, unknown>) {
    const search = String(params.search ?? '').trim();
    const sortBy = SORTABLE.includes(String(params.sort_by ?? '')) ? String(params.sort_by) : 'name';
    const sortDirection =
      String(params.sort_direction ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const perPage = this.parsePerPage(params);
    const page = this.parsePage(params);

    const where: Prisma.GroupWhereInput = search
      ? {
          OR: [{ name: { contains: search } }, { slug: { contains: search } }],
        }
      : {};

    const orderBy = this.buildOrderBy(sortBy, sortDirection);

    const [total, items] = await Promise.all([
      this.prisma.group.count({ where }),
      this.prisma.group.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: GROUP_COUNT_INCLUDE,
      }),
    ]);

    const data = items.map((group) => this.toGroupResource(group));

    return buildPaginationEnvelope(req, { data, total, perPage, page });
  }

  async store(dto: StoreGroupDto) {
    const name = dto.name.trim();
    const provided = this.clean(dto.slug);

    await this.assertNameUnique(name, null);
    await this.assertSlugUnique(provided, null);

    const slug = await this.resolveSlug(name, provided, null);

    const group = await this.prisma.group.create({
      data: {
        name,
        slug,
        description: this.clean(dto.description),
        color: this.clean(dto.color),
      },
    });

    return { data: this.toGroupResource(group) };
  }

  async show(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: this.parseIdOrThrow(id) },
      include: GROUP_COUNT_INCLUDE,
    });

    if (!group) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return { data: this.toGroupResource(group) };
  }

  async update(id: string, dto: UpdateGroupDto) {
    const numericId = this.parseId(id);

    if (numericId === null || numericId === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const existing = await this.prisma.group.findUnique({ where: { id: numericId } });

    if (!existing) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const provided = dto.slug !== undefined ? this.clean(dto.slug) : null;

    if (dto.name !== undefined) {
      await this.assertNameUnique(name, numericId);
    }
    if (dto.slug !== undefined) {
      await this.assertSlugUnique(provided, numericId);
    }

    const data: Prisma.GroupUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = name;
    }
    if (dto.description !== undefined) {
      data.description = this.clean(dto.description);
    }
    if (dto.color !== undefined) {
      data.color = this.clean(dto.color);
    }

    if (dto.name !== undefined) {
      data.slug = await this.resolveSlug(name, provided, numericId);
    } else if (dto.slug !== undefined) {
      data.slug = provided ?? existing.slug;
    }

    const group = await this.prisma.group.update({
      where: { id: numericId },
      data,
    });

    return { data: this.toGroupResource(group) };
  }

  async destroy(id: string) {
    const numericId = this.parseId(id);

    if (numericId === null || numericId === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const result = await this.prisma.group.deleteMany({ where: { id: numericId } });

    if (result.count === 0) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return { message: 'Group deleted successfully' };
  }

  async assignContacts(id: string, dto: AssignContactsDto) {
    const group = await this.requireGroup(id);
    const contactIds = [...new Set(dto.contact_ids)];

    await this.assertContactsExist(contactIds);

    await this.attachContacts(group.id, contactIds);

    return { data: this.toGroupResource(await this.loadWithCount(group.id)) };
  }

  async removeContacts(id: string, dto: AssignContactsDto) {
    const group = await this.requireGroup(id);
    const contactIds = [...new Set(dto.contact_ids)];

    await this.assertContactsExist(contactIds);

    if (contactIds.length > 0) {
      await this.prisma.contactGroup.deleteMany({
        where: {
          group_id: group.id,
          contact_id: { in: contactIds },
        },
      });
    }

    return { data: this.toGroupResource(await this.loadWithCount(group.id)) };
  }

  private async requireGroup(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: this.parseIdOrThrow(id) },
    });

    if (!group) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return group;
  }

  private async loadWithCount(groupId: number): Promise<GroupWithCount> {
    return this.prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      include: GROUP_COUNT_INCLUDE,
    });
  }

  private async attachContacts(groupId: number, contactIds: number[]): Promise<void> {
    for (const contactId of contactIds) {
      try {
        await this.prisma.contactGroup.create({
          data: { group_id: groupId, contact_id: contactId },
        });
      } catch (error) {
        if ((error as { code?: string })?.code !== 'P2002') {
          throw error;
        }
      }
    }
  }

  private async assertNameUnique(name: string, ignoringId: number | null): Promise<void> {
    const existing = await this.prisma.group.findFirst({
      where: {
        name: name ?? '',
        ...(ignoringId !== null ? { id: { not: ignoringId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      this.throwFieldError('name', 'The name has already been taken.');
    }
  }

  private async assertSlugUnique(slug: string | null, ignoringId: number | null): Promise<void> {
    if (!slug) {
      return;
    }

    const existing = await this.prisma.group.findFirst({
      where: {
        slug,
        ...(ignoringId !== null ? { id: { not: ignoringId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      this.throwFieldError('slug', 'The slug has already been taken.');
    }
  }

  private async assertContactsExist(contactIds: number[]): Promise<void> {
    const existing = await this.prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((contact) => contact.id));

    for (let i = 0; i < contactIds.length; i++) {
      if (!existingIds.has(contactIds[i])) {
        throw new UnprocessableEntityException({
          message: `The selected contact_ids.${i} is invalid.`,
          errors: {
            [`contact_ids.${i}`]: [`The selected contact_ids.${i} is invalid.`],
          },
        });
      }
    }
  }

  private throwFieldError(field: string, detail: string): never {
    throw new UnprocessableEntityException({
      message: detail,
      errors: { [field]: [detail] },
    });
  }

  private async resolveSlug(
    name: string,
    provided: string | null,
    ignoringId: number | null,
  ): Promise<string> {
    if (provided) {
      return provided;
    }

    const base = slugify(name);
    let slug = base;
    let counter = 2;

    while (
      await this.prisma.group.findFirst({
        where: {
          slug,
          ...(ignoringId !== null ? { id: { not: ignoringId } } : {}),
        },
        select: { id: true },
      })
    ) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private clean(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
  }

  private parsePerPage(params: Record<string, unknown>): number {
    let perPage = DEFAULT_PER_PAGE;

    if (params.per_page !== undefined && params.per_page !== null && params.per_page !== '') {
      const parsed = parseInt(String(params.per_page), 10);
      perPage = Number.isNaN(parsed) ? 0 : parsed;
    }

    if (perPage < 1) {
      perPage = 1;
    }

    return Math.min(perPage, 100);
  }

  private parsePage(params: Record<string, unknown>): number {
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

  private parseIdOrThrow(id: string): number {
    const parsed = this.parseId(id);

    if (parsed === null || parsed === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return parsed;
  }

  private buildOrderBy(
    sortBy: string,
    direction: 'asc' | 'desc',
  ): Prisma.GroupOrderByWithRelationInput {
    if (sortBy === 'contacts_count') {
      return { contacts: { _count: direction } };
    }

    return { [sortBy]: direction } as Prisma.GroupOrderByWithRelationInput;
  }

  private toGroupResource(group: GroupLike) {
    const data: Record<string, unknown> = {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      color: group.color,
      created_at: formatDateTime(group.created_at),
      updated_at: formatDateTime(group.updated_at),
    };

    if (typeof group._count?.contacts === 'number') {
      data.contacts_count = group._count.contacts;
    }

    return data;
  }
}