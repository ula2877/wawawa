import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { slugify } from '../groups/groups.service.js';

export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;
export const ALLOWED_MIMES = ['text/csv', 'text/plain', 'application/csv', 'application/octet-stream'];

export interface UploadedCsvFile {
  originalname?: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportDuplicate {
  row: number;
  idpel: string;
  status: 'skipped';
  reason: string;
}

export interface ImportSummary {
  message: string;
  total_rows: number;
  created: number;
  skipped: number;
  failed: number;
  groups_created: number;
  errors: ImportError[];
  duplicates: ImportDuplicate[];
  missing_columns?: string[];
}

interface CsvRow {
  idpel?: string;
  name?: string;
  phone?: string;
  email?: string;
  customer_type?: string;
  tariff?: string;
  power?: string;
  region?: string;
  ulp?: string;
  groups: string[];
}

const REQUIRED_FIELDS = ['idpel', 'name', 'phone'] as const;
const FIELD_LABELS: Record<string, string> = {
  idpel: 'IDPEL',
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
};
const ALLOWED_CONTACT_FIELDS = [
  'idpel',
  'name',
  'phone',
  'email',
  'customer_type',
  'tariff',
  'power',
  'region',
  'ulp',
] as const;

const FIELD_ALIASES: Record<string, string[]> = {
  idpel: ['IDPEL', 'IdPel', 'Id_Pel'],
  name: ['Name'],
  phone: ['Phone', 'No HP', 'No HP WA'],
  email: ['Email', 'E-Mail', 'E_mail'],
  customer_type: ['Customer Type', 'Customer_Type', 'Type'],
  tariff: ['Tariff'],
  power: ['Power', 'Power (VA)', 'Power VA', 'Power_VA'],
  region: ['Region'],
  ulp: ['ULP'],
  groups: ['Groups', 'Group', 'Tags'],
};

const FRONTEND_FIELD_MAP: Record<string, string> = {
  name: 'name',
  idpel: 'idpel',
  phone: 'phone',
  email: 'email',
  customerType: 'customer_type',
  tariff: 'tariff',
  power: 'power',
  region: 'region',
  ulp: 'ulp',
  groups: 'groups',
};

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const ALIAS_LOOKUP: Record<string, string> = (() => {
  const lookup: Record<string, string> = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      lookup[alias.toLowerCase().replace(/[^a-z0-9]/g, '')] = field;
    }
  }

  return lookup;
})();

/**
 * Mirrors fgetcsv($handle, 0, ','): comma delimiter, double-quote enclosure
 * with "" escaping, newlines allowed inside quoted fields.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
      i += 1;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }

  rows.push([...row, field]);

  if (rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  return rows;
}

/**
 * Laravel's ContactService::normalizePhone().
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D+/g, '');

  if (digits === '') {
    return '';
  }

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  if (!digits.startsWith('62')) {
    return `62${digits}`;
  }

  return digits;
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async import(file: UploadedCsvFile | undefined, mappingRaw: unknown): Promise<ImportSummary> {
    if (!file) {
      this.throwFileError('A CSV file is required.');
    }

    if (!ALLOWED_MIMES.includes(file.mimetype ?? '')) {
      this.throwFileError('The file must be a CSV file.');
    }

    const mapping = this.parseMapping(mappingRaw);
    const rows = parseCsv(file.buffer.toString('utf-8'));

    if (rows.length === 0 || this.isBlankRow(rows[0])) {
      return this.invalidFormat(['IDPEL', 'Name', 'Phone']);
    }

    const header = rows[0];
    const fieldsPerColumn = header.map((cell) => this.mappedField(cell, mapping));

    const present = new Set(header.map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, '')));
    const missing = REQUIRED_FIELDS.filter((field) => !present.has(field)).map(
      (field) => FIELD_LABELS[field],
    );

    if (missing.length > 0) {
      return this.invalidFormat(missing);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contact.findMany({
        select: { idpel: true, phone: true },
      });

      const existingIdpels = new Set(existing.map((contact) => contact.idpel));
      const existingPhones = new Set(existing.map((contact) => contact.phone));
      const seenIdpels = new Set<string>();
      const seenPhones = new Set<string>();
      const groupIdsBySlug = new Map<string, number>();

      let totalRows = 0;
      let created = 0;
      let skipped = 0;
      let failed = 0;
      let groupsCreated = 0;
      const errors: ImportError[] = [];
      const duplicates: ImportDuplicate[] = [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i];

        if (this.isBlankRow(cells)) {
          continue;
        }

        totalRows++;
        const rowNumber = i + 1;

        const record = this.buildRecord(cells, fieldsPerColumn);
        const rowErrors = this.validateRecord(record);

        if (rowErrors.length > 0) {
          failed++;
          errors.push(...rowErrors.map((e) => ({ row: rowNumber, ...e })));
          continue;
        }

        const idpel = record.idpel ?? '';
        const name = record.name ?? '';
        const phone = normalizePhone(record.phone ?? '');

        if (seenIdpels.has(idpel) || existingIdpels.has(idpel)) {
          skipped++;
          duplicates.push({
            row: rowNumber,
            idpel,
            status: 'skipped',
            reason: 'IDPEL already exists',
          });
          continue;
        }

        if (seenPhones.has(phone) || existingPhones.has(phone)) {
          skipped++;
          duplicates.push({
            row: rowNumber,
            idpel,
            status: 'skipped',
            reason: 'Phone already exists',
          });
          continue;
        }

        const contact = await tx.contact.create({
          data: {
            idpel,
            name,
            phone,
            email: this.nullable(record.email),
            customer_type: this.nullable(record.customer_type),
            tariff: this.nullable(record.tariff),
            power: this.nullablePower(record.power),
            region: this.nullable(record.region),
            ulp: this.nullable(record.ulp),
          },
        });

        created++;
        seenIdpels.add(idpel);
        existingIdpels.add(idpel);
        seenPhones.add(phone);
        existingPhones.add(phone);

        const groupIds = await this.resolveGroups(
          tx,
          record.groups,
          groupIdsBySlug,
          () => groupsCreated++,
        );

        if (groupIds.length > 0) {
          await tx.contactGroup.createMany({
            data: groupIds.map((group_id) => ({
              contact_id: contact.id,
              group_id,
            })),
          });
        }
      }

      return {
        message: 'CSV import completed',
        total_rows: totalRows,
        created,
        skipped,
        failed,
        groups_created: groupsCreated,
        errors,
        duplicates,
      };
    });
  }

  private invalidFormat(missingColumns: string[]): ImportSummary {
    return {
      message: 'Invalid CSV format',
      missing_columns: missingColumns,
      total_rows: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      groups_created: 0,
      errors: [],
      duplicates: [],
    };
  }

  private throwFileError(message: string): never {
    throw new UnprocessableEntityException({
      message,
      errors: { file: [message] },
    });
  }

  private parseMapping(raw: unknown): Record<string, string> | null {
    if (raw === null || raw === undefined) {
      return null;
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);

        return this.isStringRecord(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }

    return this.isStringRecord(raw) ? raw : null;
  }

  private isStringRecord(value: unknown): value is Record<string, string> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((item) => typeof item === 'string')
    );
  }

  private mappedField(header: string, mapping: Record<string, string> | null): string | null {
    const trimmed = header.trim();

    if (mapping) {
      const option = mapping[trimmed];

      if (option !== undefined) {
        if (option === '' || option === 'none' || option === 'ignore') {
          return null;
        }

        return FRONTEND_FIELD_MAP[option] ?? null;
      }
    }

    return ALIAS_LOOKUP[trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')] ?? null;
  }

  private buildRecord(cells: string[], fieldsPerColumn: (string | null)[]): CsvRow {
    const values: Record<string, string> = {};
    const groupsParts: string[] = [];

    for (let j = 0; j < cells.length; j++) {
      const field = fieldsPerColumn[j];

      if (!field) {
        continue;
      }

      const value = cells[j].trim();

      if (field === 'groups') {
        if (value !== '') {
          groupsParts.push(value);
        }
      } else if ((ALLOWED_CONTACT_FIELDS as readonly string[]).includes(field)) {
        values[field] = value;
      }
    }

    return {
      idpel: values['idpel'],
      name: values['name'],
      phone: values['phone'],
      email: values['email'],
      customer_type: values['customer_type'],
      tariff: values['tariff'],
      power: values['power'],
      region: values['region'],
      ulp: values['ulp'],
      groups: groupsParts,
    };
  }

  private validateRecord(record: CsvRow): Array<Omit<ImportError, 'row'>> {
    const errors: Array<Omit<ImportError, 'row'>> = [];

    const idpel = record.idpel ?? '';
    if (idpel === '') {
      errors.push({ field: 'IDPEL', message: 'IDPEL is required' });
    } else if (Array.from(idpel).length > 30) {
      errors.push({ field: 'IDPEL', message: 'IDPEL must not exceed 30 characters' });
    }

    const name = record.name ?? '';
    if (name === '') {
      errors.push({ field: 'Name', message: 'Name is required' });
    } else if (Array.from(name).length > 150) {
      errors.push({ field: 'Name', message: 'Name must not exceed 150 characters' });
    }

    const phone = record.phone ?? '';
    if (phone === '') {
      errors.push({ field: 'Phone', message: 'Phone is required' });
    } else {
      const normalized = normalizePhone(phone);

      if (normalized === '' || !/^\d{7,15}$/.test(normalized)) {
        errors.push({ field: 'Phone', message: 'Invalid phone number' });
      }
    }

    const email = record.email ?? '';
    if (email !== '' && !EMAIL_PATTERN.test(email)) {
      errors.push({ field: 'Email', message: 'Invalid email address' });
    }

    return errors;
  }

  private parseGroupNames(value: string): string[] {
    return value
      .split('|')
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '');
  }

  private async resolveGroups(
    tx: Prisma.TransactionClient,
    groupsValue: string[],
    cache: Map<string, number>,
    onCreated: () => void,
  ): Promise<number[]> {
    const names = new Map<string, string>();

    for (const part of groupsValue) {
      for (const name of this.parseGroupNames(part)) {
        const key = slugify(name);

        if (!names.has(key)) {
          names.set(key, name);
        }
      }
    }

    const groupIds: number[] = [];

    for (const [key, name] of names) {
      let groupId = cache.get(key);

      if (groupId === undefined) {
        const existing = await tx.group.findUnique({
          where: { slug: key },
          select: { id: true },
        });

        if (existing) {
          groupId = existing.id;
        } else {
          const createdGroup = await tx.group.create({
            data: { name, slug: key, description: null },
          });
          groupId = createdGroup.id;
          onCreated();
        }

        cache.set(key, groupId);
      }

      groupIds.push(groupId);
    }

    return groupIds;
  }

  private isBlankRow(cells: string[]): boolean {
    return cells.every((cell) => cell.trim() === '');
  }

  private nullable(value: string | undefined): string | null {
    if (value === undefined || value.trim() === '') {
      return null;
    }

    return value;
  }

  private nullablePower(value: string | undefined): number | null {
    if (value === undefined || value.trim() === '') {
      return null;
    }

    const trimmed = value.trim();

    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return null;
    }

    return Math.trunc(Number(trimmed));
  }
}