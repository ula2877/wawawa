import { delay } from '@/utils/format';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
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

type RequestOptions = RequestInit & { json?: unknown };

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;

  const reqHeaders = new Headers(headers);
  const token = await getAuthToken();
  if (token) {
    reqHeaders.set('Authorization', `Bearer ${token}`);
  }
  reqHeaders.set('Accept', 'application/json');
  if (json !== undefined) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: reqHeaders,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please make sure the backend is running.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message =
      (data as { message?: string } | null)?.message ??
      (data as { errors?: Record<string, string[]> } | null)?.errors
        ? Object.values((data as { errors: Record<string, string[]> }).errors).flat().join(', ')
        : 'Request failed';
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export const API_DELAY = 380;

export async function simulate<T>(data: T | (() => T), ms: number = API_DELAY): Promise<T> {
  await delay(ms + Math.floor(Math.random() * 220));
  return typeof data === 'function' ? (data as () => T)() : data;
}

export function createId(prefix: string, existing: string[]): string {
  let n = existing.length + 1;
  let id = `${prefix}-${String(n).padStart(3, '0')}`;
  const seen = new Set(existing);
  while (seen.has(id)) {
    n++;
    id = `${prefix}-${String(n).padStart(3, '0')}`;
  }
  return id;
}

export function delayBetween(min: number, max: number): Promise<void> {
  return delay(min + Math.floor(Math.random() * (max - min)));
}