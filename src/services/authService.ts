import type { UserProfile } from '@/types';
import { apiFetch } from './api';

export interface AuthPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface Session {
  user: UserProfile;
  token: string;
}

interface UserRaw {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface LoginResponse {
  message: string;
  token: string;
  token_type: string;
  user: UserRaw;
}

interface UpdateProfileResponse {
  message: string;
  user: UserRaw;
}

function toFrontendRole(role: string): UserProfile['role'] {
  const map: Record<string, UserProfile['role']> = {
    superadmin: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    operator: 'Operator',
    viewer: 'Viewer',
  };
  return (map[role.toLowerCase()] ?? role) as UserProfile['role'];
}

function buildUser(raw: UserRaw, existing?: Partial<UserProfile>): UserProfile {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    phone: existing?.phone ?? '',
    avatarColor: existing?.avatarColor ?? 'bg-whatsapp-500',
    role: toFrontendRole(raw.role),
  };
}

export const authService = {
  async login(payload: AuthPayload): Promise<Session> {
    const data = await apiFetch<LoginResponse>('/login', {
      method: 'POST',
      json: { email: payload.email, password: payload.password },
    });

    return {
      token: data.token,
      user: buildUser(data.user),
    };
  },

  async requestPasswordReset(_email: string): Promise<void> {
    throw new Error('Password reset is not available yet.');
  },

  async resetPassword(_token: string, _password: string): Promise<void> {
    throw new Error('Password reset is not available yet.');
  },

  async changePassword(payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> {
    await apiFetch('/profile/password', {
      method: 'PUT',
      json: payload,
    });
  },

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    const data = await apiFetch<UpdateProfileResponse>('/profile', {
      method: 'PUT',
      json: {
        name: patch.name,
        email: patch.email,
      },
    });
    return buildUser(data.user, patch);
  },

  async logout(): Promise<void> {
    await apiFetch('/logout', { method: 'POST' });
  },
};
