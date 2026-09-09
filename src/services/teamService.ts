import type { ActivityLog, ActivityModule, TeamMember } from '@/types';
import { apiFetch } from './api';

interface TeamMemberDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
  avatarColor: string;
}

interface ActivityLogDTO {
  id: string;
  user: string;
  action: string;
  module: string;
  date: string;
}

type Single<T> = { data: T };
type ListResponse<T> = { data: T[] };

function normalizeMember(raw: TeamMemberDTO): TeamMember {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role as TeamMember['role'],
    status: raw.status as TeamMember['status'],
    lastLogin: raw.lastLogin,
    avatarColor: raw.avatarColor,
  };
}

function normalizeLog(raw: ActivityLogDTO): ActivityLog {
  return {
    id: raw.id,
    user: raw.user,
    action: raw.action,
    module: raw.module as ActivityModule,
    date: raw.date,
  };
}

function extractId(numericId: string): number {
  const n = parseInt(numericId.replace('US-', ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export const teamService = {
  async getMembers(): Promise<TeamMember[]> {
    const res = await apiFetch<ListResponse<TeamMemberDTO>>('/team');
    return res.data.map(normalizeMember);
  },

  async createMember(input: { name: string; email: string; role: TeamMember['role']; password: string }): Promise<TeamMember> {
    const res = await apiFetch<Single<TeamMemberDTO>>('/team', {
      method: 'POST',
      json: { name: input.name, email: input.email, role: input.role, password: input.password },
    });
    return normalizeMember(res.data);
  },

  async updateMember(id: string, patch: Partial<TeamMember>): Promise<TeamMember> {
    const numericId = extractId(id);
    const body: Record<string, unknown> = {};
    if (patch.role !== undefined) body.role = patch.role;
    if (patch.status !== undefined) body.status = patch.status;

    const res = await apiFetch<Single<TeamMemberDTO>>(`/team/${numericId}`, {
      method: 'PUT',
      json: body,
    });
    return normalizeMember(res.data);
  },

  async removeMember(id: string): Promise<void> {
    const numericId = extractId(id);
    await apiFetch<void>(`/team/${numericId}`, { method: 'DELETE' });
  },
};

export const activityService = {
  async getLogs(module?: ActivityModule | ''): Promise<ActivityLog[]> {
    const params = module ? `?module=${encodeURIComponent(module)}` : '';
    const res = await apiFetch<ListResponse<ActivityLogDTO>>(`/activity-logs${params}`);
    return res.data.map(normalizeLog);
  },

  async log(user: string, action: string, module: ActivityModule): Promise<void> {
    await apiFetch<void>('/activity-logs', {
      method: 'POST',
      json: { user, action, module },
    });
  },
};

export function whoAmI(): string {
  const raw = localStorage.getItem('wablast:auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.user?.name) return parsed.user.name;
    } catch {
      // ignore
    }
  }
  return 'John Prakoso';
}
