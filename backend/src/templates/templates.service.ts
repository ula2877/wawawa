import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '../generated/prisma/client.js';
import { buildPaginationEnvelope, formatDateTime } from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { QueryTemplatesDto } from './dto/query-templates.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';

const SORTABLE = [
  'name',
  'code',
  'category',
  'language',
  'usage_count',
  'created_at',
  'updated_at',
];

/**
 * Mirrors config/template.php: the only supported personalization variables
 * (Contact business fields) and the exposed category/language lists.
 */
const CATEGORIES = [
  'Marketing',
  'Utility',
  'Authentication',
  'Transactional',
  'Reminder',
  'Informational',
];

const LANGUAGES = ['id', 'en'];

const ALLOWED_VARIABLES = [
  'name',
  'idpel',
  'phone',
  'email',
  'customer_type',
  'tariff',
  'power',
  'region',
  'ulp',
  'groups',
];

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;

export interface TemplateResource {
  id: number;
  name: string;
  code: string;
  category: string;
  language: string;
  content: string;
  variables: string[];
  usage_count: number;
  created_at: string | null;
  updated_at: string | null;
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(req: Request, params: QueryTemplatesDto) {
    const where = this.buildWhere(params);
    const orderBy = this.buildOrderBy(params);
    const perPage = this.parsePerPage(params);
    const page = this.parsePage(params);

    const [total, items] = await Promise.all([
      this.prisma.template.count({ where }),
      this.prisma.template.findMany({
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

  meta() {
    return {
      categories: CATEGORIES,
      languages: LANGUAGES,
      variables: ALLOWED_VARIABLES,
    };
  }

  async create(dto: CreateTemplateDto) {
    const variables = this.validateVariables(dto.content);

    const template = await this.prisma.template.create({
      data: {
        name: dto.name,
        category: dto.category,
        language: dto.language,
        content: dto.content,
        variables: this.serializeVariables(variables),
        code: await this.generateCode(),
        usage_count: 0,
      },
    });

    return { data: this.toResource(template) };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: this.parseIdOrThrow(id) },
    });

    if (!template) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    return { data: this.toResource(template) };
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.template.findUnique({
      where: { id: this.parseId(id) ?? 0 },
    });

    if (!existing) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const data: Prisma.TemplateUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.category !== undefined) {
      data.category = dto.category;
    }
    if (dto.language !== undefined) {
      data.language = dto.language;
    }
    if (dto.content !== undefined) {
      data.content = dto.content;
      data.variables = this.serializeVariables(this.validateVariables(dto.content));
    }

    const template = await this.prisma.template.update({
      where: { id: existing.id },
      data,
    });

    return { data: this.toResource(template) };
  }

  async remove(id: string): Promise<void> {
    const numericId = this.parseId(id);

    if (numericId === null || numericId === undefined) {
      throw new NotFoundException({ message: 'Not Found' });
    }

    const result = await this.prisma.template.deleteMany({ where: { id: numericId } });

    if (result.count === 0) {
      throw new NotFoundException({ message: 'Not Found' });
    }
  }

  /**
   * Extract the unique {{variable}} placeholder names from content, in order
   * of first appearance. Mirrors TemplateService::extractVariables().
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Reject any placeholder that is not an allowed Contact variable. Mirrors
   * TemplateService::validateVariables(): unknown placeholders produce a 422
   * with one error message per unknown variable.
   */
  private validateVariables(content: string): string[] {
    const variables = this.extractVariables(content);
    const unknown = variables.filter((v) => !ALLOWED_VARIABLES.includes(v));

    if (unknown.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Invalid template variable',
        errors: {
          content: unknown.map((v) => `Unknown template variable: {{${v}}}`),
        },
      });
    }

    return variables;
  }

  /**
   * Generate the next available unique code in TPL-### format. Mirrors
   * TemplateService::generateCode(): base off the highest id, then bump until
   * the code is free.
   */
  private async generateCode(): Promise<string> {
    const last = await this.prisma.template.findFirst({
      where: { code: { startsWith: 'TPL-' } },
      orderBy: { id: 'desc' },
      select: { code: true },
    });

    let next = last ? parseInt(last.code.slice(4), 10) + 1 : 1;
    let code = this.padCode(next);

    while (
      await this.prisma.template.findUnique({
        where: { code },
        select: { id: true },
      })
    ) {
      next += 1;
      code = this.padCode(next);
    }

    return code;
  }

  private padCode(n: number): string {
    return `TPL-${String(n).padStart(3, '0')}`;
  }

  private serializeVariables(variables: string[]): string {
    return JSON.stringify(variables);
  }

  private parseVariables(raw: string | null): string[] {
    if (raw === null || raw === undefined || raw === '') {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // Fall through to an empty array if the stored value is corrupt.
    }

    return [];
  }

  private buildWhere(params: QueryTemplatesDto): Prisma.TemplateWhereInput {
    const where: Prisma.TemplateWhereInput = {};

    const search = String(params.search ?? '').trim();
    if (search !== '') {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (String(params.category ?? '').trim() !== '') {
      where.category = String(params.category).trim();
    }

    if (String(params.language ?? '').trim() !== '') {
      where.language = String(params.language).trim();
    }

    return where;
  }

  private buildOrderBy(params: QueryTemplatesDto): Prisma.TemplateOrderByWithRelationInput {
    const field = SORTABLE.includes(String(params.sort_by ?? ''))
      ? String(params.sort_by)
      : 'created_at';
    const direction = String(params.sort_direction ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    return { [field]: direction } as Prisma.TemplateOrderByWithRelationInput;
  }

  private parsePerPage(params: QueryTemplatesDto): number {
    let perPage = DEFAULT_PER_PAGE;

    if (params.per_page !== undefined && params.per_page !== null && params.per_page !== '') {
      const parsed = parseInt(String(params.per_page), 10);
      perPage = Number.isNaN(parsed) ? 0 : parsed;
    }

    if (perPage < 1) {
      perPage = DEFAULT_PER_PAGE;
    }

    return Math.min(perPage, MAX_PER_PAGE);
  }

  private parsePage(params: QueryTemplatesDto): number {
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

  private toResource(template: {
    id: number;
    name: string;
    code: string;
    category: string;
    language: string;
    content: string;
    variables: string | null;
    usage_count: number;
    created_at: Date;
    updated_at: Date;
  }): TemplateResource {
    return {
      id: template.id,
      name: template.name,
      code: template.code,
      category: template.category,
      language: template.language,
      content: template.content,
      variables: this.parseVariables(template.variables),
      usage_count: template.usage_count,
      created_at: formatDateTime(template.created_at),
      updated_at: formatDateTime(template.updated_at),
    };
  }
}