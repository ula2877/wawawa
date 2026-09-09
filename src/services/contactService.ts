import type { Contact, ContactGroup } from '@/types';
import { apiFetch } from './api';
import { avatarColor } from '@/utils/format';

/**
 * Backend-facing DTOs (as returned by the Laravel resources) and the shared
 * Laravel pagination envelope. The service layer normalizes these into the
 * frontend types used by the components.
 */
export interface ContactDTO {
  id: number;
  idpel: string | null;
  name: string;
  phone: string;
  email: string | null;
  customer_type: string | null;
  tariff: string | null;
  power: number | null;
  region: string | null;
  ulp: string | null;
  groups?: GroupDTO[];
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  contacts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

type Single<T> = { data: T };

export interface ImportSummary {
  message: string;
  total_rows: number;
  created: number;
  skipped: number;
  failed: number;
  groups_created?: number;
  errors: { row: number; field: string; message: string }[];
  duplicates: { row: number; idpel: string; status: string; reason: string }[];
  missing_columns?: string[];
}

export interface ContactInput {
  name: string;
  phone: string;
  email?: string | null;
  idpel?: string | null;
  customerType?: string | null;
  tariff?: string | null;
  power?: string | number | null;
  region?: string | null;
  ulp?: string | null;
  groupIds: string[];
  whatsappStatus?: string | null;
  whatsappOptIn?: boolean | null;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
  custom_fields?: Record<string, string>;
}

export interface ContactQuery {
  search?: string;
  customer_type?: string;
  tariff?: string;
  power?: string | number;
  region?: string;
  ulp?: string;
  group_id?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

function normalizeContact(raw: ContactDTO): Contact {
  const groups = raw.groups ?? [];
  return {
    id: String(raw.id),
    idpel: raw.idpel,
    name: raw.name,
    phone: raw.phone,
    email: raw.email,
    customerType: raw.customer_type,
    tariff: raw.tariff,
    power: raw.power != null ? String(raw.power) : null,
    region: raw.region,
    ulp: raw.ulp,
    status: 'active',
    whatsappStatus: 'unknown',
    whatsappOptIn: false,
    company: null,
    address: null,
    notes: null,
    groupIds: groups.map((g) => String(g.id)),
    lastContact: raw.last_contact_at,
    createdAt: raw.created_at,
    custom_fields: {},
  };
}

function normalizeGroup(raw: GroupDTO): ContactGroup {
  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? '',
    color: raw.color || avatarColor(raw.name),
    createdAt: raw.created_at,
    contactsCount: raw.contacts_count ?? 0,
  };
}

function toGroupIds(ids: string[]): number[] {
  return ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
}

function contactPayload(input: ContactInput) {
  return {
    name: input.name,
    idpel: input.idpel || null,
    phone: input.phone,
    email: input.email || null,
    customer_type: input.customerType || null,
    tariff: input.tariff || null,
    power: input.power != null && input.power !== '' ? Number(input.power) : null,
    region: input.region || null,
    ulp: input.ulp || null,
    group_ids: toGroupIds(input.groupIds),
  };
}

function extractContact(res: Single<ContactDTO>): Contact {
  return normalizeContact(res.data);
}

function extractGroup(res: Single<GroupDTO>): ContactGroup {
  return normalizeGroup(res.data);
}

export const contactService = {
  /**
   * Full, unpaginated contact list. Used by screens that need the complete
   * dataset (reporting, campaign recipient selection).
   */
  async getContacts(): Promise<Contact[]> {
    const res = await apiFetch<Paged<ContactDTO>>('/contacts?per_page=100');
    return res.data.map(normalizeContact);
  },

  /**
   * Paginated contact list with backend search/filter/sort/pagination.
   */
  async getContactsPage(params: ContactQuery = {}): Promise<Paged<Contact>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    const res = await apiFetch<Paged<ContactDTO>>(`/contacts?${query.toString()}`);
    return { data: res.data.map(normalizeContact), meta: res.meta };
  },

  async getContact(id: string): Promise<Contact> {
    const res = await apiFetch<Single<ContactDTO>>(`/contacts/${id}`);
    return extractContact(res);
  },

  async createContact(input: ContactInput): Promise<Contact> {
    const res = await apiFetch<Single<ContactDTO>>('/contacts', { method: 'POST', json: contactPayload(input) });
    return extractContact(res);
  },

  async updateContact(id: string, input: ContactInput): Promise<Contact> {
    const res = await apiFetch<Single<ContactDTO>>(`/contacts/${id}`, { method: 'PUT', json: contactPayload(input) });
    return extractContact(res);
  },

  async deleteContact(id: string): Promise<void> {
    await apiFetch<void>(`/contacts/${id}`, { method: 'DELETE' });
  },

  async deleteContacts(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteContact(id);
    }
  },

  /**
   * Assign or remove a list of contacts to/from a single group.
   * Uses the backend bulk endpoints (backend prevents duplicates).
   */
  async assignGroups(ids: string[], groupIds: string[], add: boolean): Promise<void> {
    for (const groupId of groupIds) {
      const contactIds = toGroupIds(ids);
      if (add) {
        await apiFetch<GroupDTO>(`/groups/${groupId}/contacts`, {
          method: 'POST',
          json: { contact_ids: contactIds },
        });
      } else {
        await apiFetch<GroupDTO>(`/groups/${groupId}/contacts`, {
          method: 'DELETE',
          json: { contact_ids: contactIds },
        });
      }
    }
  },

  /**
   * Upload a CSV file to the backend. Laravel handles parsing, validation,
   * phone normalization, duplicate detection, group lookup/creation and
   * relationship linking. The mapping (CSV header name => target field, where
   * 'none' means Ignore) controls exactly which columns are imported.
   * Returns the import summary.
   */
  async importCsv(file: File, mapping?: Record<string, string>): Promise<ImportSummary> {
    const formData = new FormData();
    formData.append('file', file);
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }
    return apiFetch<ImportSummary>('/contacts/import', { method: 'POST', body: formData });
  },

  async getGroups(params: { search?: string } = {}): Promise<ContactGroup[]> {
    const query = new URLSearchParams({ per_page: '100' });
    if (params.search) query.set('search', params.search);
    const res = await apiFetch<Paged<GroupDTO>>(`/groups?${query.toString()}`);
    return res.data.map(normalizeGroup);
  },

  async getGroup(id: string): Promise<ContactGroup> {
    const res = await apiFetch<Single<GroupDTO>>(`/groups/${id}`);
    return extractGroup(res);
  },

  async createGroup(name: string, description: string, color?: string): Promise<ContactGroup> {
    const res = await apiFetch<Single<GroupDTO>>('/groups', {
      method: 'POST',
      json: { name: name.trim(), description: description.trim(), color: color || null },
    });
    return extractGroup(res);
  },

  async updateGroup(id: string, patch: { name?: string; description?: string; color?: string }): Promise<ContactGroup> {
    const res = await apiFetch<Single<GroupDTO>>(`/groups/${id}`, {
      method: 'PUT',
      json: {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
        ...(patch.color !== undefined ? { color: patch.color || null } : {}),
      },
    });
    return extractGroup(res);
  },

  async deleteGroup(id: string): Promise<void> {
    await apiFetch<void>(`/groups/${id}`, { method: 'DELETE' });
  },
};