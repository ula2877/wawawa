import { clsx, type ClassValue } from 'clsx';

export function cx(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null) return '0%';
  return `${value.toFixed(digits)}%`;
}

export function formatDate(isoOrString: string | null | undefined): string {
  if (!isoOrString) return '—';
  const d = new Date(isoOrString);
  if (Number.isNaN(d.getTime())) return isoOrString;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoOrString: string | null | undefined): string {
  if (!isoOrString) return '—';
  const d = new Date(isoOrString);
  if (Number.isNaN(d.getTime())) return isoOrString;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(isoOrString: string | null | undefined): string {
  if (!isoOrString) return '—';
  const d = new Date(isoOrString);
  if (Number.isNaN(d.getTime())) return isoOrString;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(isoOrString: string): string {
  const then = new Date(isoOrString).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4, 'week'],
    [12, 'month'],
  ];
  let diff = seconds;
  let label = 'second';
  for (const [factor, unit] of units) {
    if (diff < factor) {
      label = unit;
      break;
    }
    diff /= factor;
  }
  const n = Math.floor(diff);
  return `${n} ${label}${n !== 1 ? 's' : ''} ago`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
}

/**
 * Normalize a phone number to an international E.164-style digit string.
 * Always keeps the phone as a string. Never converts to a JS number.
 * e.g. "+6281234567890" / "081234567890" -> "6281234567890".
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return digits;
}

/**
 * Display a phone number in a readable WhatsApp/Indonesian format:
 * "+62 8123456789". Input is always kept as a string.
 */
export function formatPhone(phone: string): string {
  const norm = normalizePhone(phone);
  if (!norm) return phone || '—';
  const local = norm.startsWith('62') ? norm.slice(2) : norm;
  return `+62 ${local}`;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
];

export function avatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}