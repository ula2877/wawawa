import type { Template, TemplateMeta } from '@/types';
import { apiFetch } from './api';
import type { Paged, PaginationMeta } from './contactService';

/**
 * Backend-facing DTO as returned by the Laravel TemplateResource.
 */
export interface TemplateDTO {
  id: number;
  name: string;
  code: string;
  category: string;
  language: string;
  content: string;
  variables: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

type Single<T> = { data: T };

export interface TemplateQuery {
  search?: string;
  category?: string;
  language?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface TemplateInput {
  name: string;
  category: string;
  language: string;
  content: string;
}

export interface MetaDTO {
  categories: string[];
  languages: string[];
  variables: string[];
}

function normalizeTemplate(raw: TemplateDTO): Template {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    category: raw.category,
    language: raw.language,
    content: raw.content,
    variables: raw.variables ?? [],
    usage_count: raw.usage_count ?? 0,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function templatePayload(input: TemplateInput) {
  return {
    name: input.name,
    category: input.category,
    language: input.language,
    content: input.content,
  };
}

export const templateService = {
  /**
   * Same-page (server-side) collection used by the Templates list page.
   */
  async getTemplatesPage(params: TemplateQuery = {}): Promise<{ data: Template[]; meta: PaginationMeta }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    const res = await apiFetch<Paged<TemplateDTO>>(`/templates?${query.toString()}`);
    return { data: res.data.map(normalizeTemplate), meta: res.meta };
  },

  /**
   * Full, unpaginated template list. Used by screens that need the complete
   * dataset (e.g. the campaign wizard template picker).
   */
  async getTemplates(): Promise<Template[]> {
    const query = new URLSearchParams({ per_page: '100', sort_by: 'name', sort_direction: 'asc' });
    const res = await apiFetch<Paged<TemplateDTO>>(`/templates?${query.toString()}`);
    return res.data.map(normalizeTemplate);
  },

  async getTemplate(id: number): Promise<Template> {
    const res = await apiFetch<Single<TemplateDTO>>(`/templates/${id}`);
    return normalizeTemplate(res.data);
  },

  async createTemplate(input: TemplateInput): Promise<Template> {
    const res = await apiFetch<Single<TemplateDTO>>('/templates', {
      method: 'POST',
      json: templatePayload(input),
    });
    return normalizeTemplate(res.data);
  },

  async updateTemplate(id: number, patch: Partial<TemplateInput>): Promise<Template> {
    const res = await apiFetch<Single<TemplateDTO>>(`/templates/${id}`, {
      method: 'PUT',
      json: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
      },
    });
    return normalizeTemplate(res.data);
  },

  async deleteTemplate(id: number): Promise<void> {
    await apiFetch<void>(`/templates/${id}`, { method: 'DELETE' });
  },

  /**
   * Backend-driven categories/languages/variables so the UI never hardcodes them.
   */
  async getMeta(): Promise<TemplateMeta> {
    const res = await apiFetch<MetaDTO>('/templates/meta');
    return {
      categories: res.categories,
      languages: res.languages,
      variables: res.variables,
    };
  },
};
