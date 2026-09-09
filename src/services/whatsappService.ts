import type { AccountStatus, WhatsAppAccount, WhatsAppAccountInput } from '@/types';
import { apiFetch } from './api';

export type { WhatsAppAccount };

/** Backend DTO as returned by the Baileys WhatsApp accounts API. */
export interface WhatsAppAccountDTO {
  id: string;
  name: string;
  phone: string | null;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'LOGGED_OUT';
  is_default: boolean;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ConnectionState {
  id: string;
  status: WhatsAppAccountDTO['status'];
}

type Single = { data: WhatsAppAccountDTO };
type Connection = { data: ConnectionState };

function toStatus(status: WhatsAppAccountDTO['status']): AccountStatus {
  return status.toLowerCase() as AccountStatus;
}

function normalize(raw: WhatsAppAccountDTO): WhatsAppAccount {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    status: toStatus(raw.status),
    is_default: raw.is_default,
    last_connected_at: raw.last_connected_at,
    last_disconnected_at: raw.last_disconnected_at,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function extractSingle(res: Single): WhatsAppAccount {
  return normalize(res.data);
}

export const whatsappService = {
  async getAccounts(): Promise<WhatsAppAccount[]> {
    const res = await apiFetch<{ data: WhatsAppAccountDTO[] }>('/whatsapp-accounts?per_page=100');
    return res.data.map(normalize);
  },

  async getAccount(id: string): Promise<WhatsAppAccount> {
    const res = await apiFetch<Single>(`/whatsapp-accounts/${id}`);
    return extractSingle(res);
  },

  async createAccount(input: WhatsAppAccountInput): Promise<WhatsAppAccount> {
    const res = await apiFetch<Single>('/whatsapp-accounts', {
      method: 'POST',
      json: { name: input.name.trim() },
    });
    return extractSingle(res);
  },

  async updateAccount(id: string, patch: Partial<WhatsAppAccountInput>): Promise<WhatsAppAccount> {
    const res = await apiFetch<Single>(`/whatsapp-accounts/${id}`, {
      method: 'PUT',
      json: { name: patch.name?.trim() },
    });
    return extractSingle(res);
  },

  async deleteAccount(id: string): Promise<void> {
    await apiFetch<unknown>(`/whatsapp-accounts/${id}`, { method: 'DELETE' });
  },

  /** Marks the account as the default sender on the backend. */
  async setDefault(id: string): Promise<void> {
    await apiFetch<unknown>(`/whatsapp-accounts/${id}/default`, { method: 'PUT' });
  },

  /** Starts the Baileys connection; a QR appears on the socket stream. */
  async connect(id: string): Promise<AccountStatus> {
    const res = await apiFetch<Connection>(`/whatsapp-accounts/${id}/connect`, { method: 'POST' });
    return toStatus(res.data.status);
  },

  /** Disconnects but keeps the session file so a later connect is instant. */
  async disconnect(id: string): Promise<AccountStatus> {
    const res = await apiFetch<Connection>(`/whatsapp-accounts/${id}/disconnect`, { method: 'POST' });
    return toStatus(res.data.status);
  },

  /** Fully logs out and deletes the stored session folder. */
  async logout(id: string): Promise<AccountStatus> {
    const res = await apiFetch<Connection>(`/whatsapp-accounts/${id}/logout`, { method: 'POST' });
    return toStatus(res.data.status);
  },
};