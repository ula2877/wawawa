import { io, type Socket } from 'socket.io-client';
import type {
  AccountStatus,
  WaConnectedPayload,
  WaDisconnectedPayload,
  WaQrPayload,
  WaStatusPayload,
} from '@/types';
import { API_BASE_URL } from './api';

/**
 * Singleton Socket.IO client for the backend /whatsapp namespace.
 * The gateway verifies the JWT during handshake (auth.token), so we cache the
 * socket for the session and re-create it explicitly after login/logout.
 */

export interface WaStatusEvent {
  accountId: string;
  status: AccountStatus;
}

export interface WaConnectedEvent {
  accountId: string;
  phone: string;
  status: 'connected';
}

export interface WaDisconnectedEvent {
  accountId: string;
  reason: string;
  status: 'disconnected';
}

export interface WaQrEvent extends WaQrPayload {
  accountId: string;
  qr: string;
  image?: string;
}

let socket: Socket | null = null;

function socketOrigin(): string {
  const override = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (override) return override.replace(/\/+$/, '');
  return API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
}

interface AuthSession {
  token: string;
}

async function getAuthToken(): Promise<string | null> {
  const raw = localStorage.getItem('wablast:auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed?.token) return parsed.token;
    } catch {
      // ignore corrupted storage
    }
  }

  const { useAuthStore } = await import('@/store/authStore');
  return useAuthStore.getState().token ?? null;
}

/** Creates (or returns the cached) authenticated socket. Async because the
 * JWT is resolved from storage before the handshake. */
export async function connectWaSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  socket = io(`${socketOrigin()}/whatsapp`, {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
}

export function getWaSocket(): Socket | null {
  return socket;
}

export function disconnectWaSocket(): void {
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
}

function listen<T>(event: string, handler: (payload: T) => void): () => void {
  const rawHandler = (payload: T) => handler(payload);
  connectWaSocket()
    .then((sock) => sock.on(event, rawHandler))
    .catch(() => {
      // Handshake failed (e.g. no token yet); ignore live updates.
    });
  return () => socket?.off(event, rawHandler);
}

export const waSocket = {
  connect: connectWaSocket,
  get: getWaSocket,
  disconnect: disconnectWaSocket,

  onQr(cb: (payload: WaQrEvent) => void): () => void {
    return listen<WaQrPayload>('whatsapp:qr', (p) =>
      cb({ accountId: p.accountId, qr: p.qr, image: p.image }),
    );
  },

  onStatus(cb: (event: WaStatusEvent) => void): () => void {
    return listen<WaStatusPayload>('whatsapp:status', (p) =>
      cb({
        accountId: p.accountId,
        status: p.status.toLowerCase() as AccountStatus,
      }),
    );
  },

  onConnected(cb: (event: WaConnectedEvent) => void): () => void {
    return listen<WaConnectedPayload>('whatsapp:connected', (p) =>
      cb({
        accountId: p.accountId,
        phone: p.phone,
        status: 'connected',
      }),
    );
  },

  onDisconnected(cb: (event: WaDisconnectedEvent) => void): () => void {
    return listen<WaDisconnectedPayload>('whatsapp:disconnected', (p) =>
      cb({
        accountId: p.accountId,
        reason: p.reason,
        status: 'disconnected',
      }),
    );
  },
};