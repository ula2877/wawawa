export type CampaignStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Running'
  | 'Completed'
  | 'Paused'
  | 'Failed'
  | 'Cancelled';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  senderId: string;
  senderName: string;
  recipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  status: CampaignStatus;
  scheduledAt: string | null;
  message: string;
  mediaType: 'none' | 'image' | 'video' | 'document' | 'audio';
  mediaName?: string;
  mediaPath?: string;
  mediaMimetype?: string;
  mediaSize?: number;
  createdAt: string;
  groupIds: string[];
  contactIds?: string[];
  progress: number;
}

export type CustomerStatus = 'active' | 'inactive';

export type WhatsAppStatus = 'eligible' | 'opted_out' | 'blocked' | 'invalid' | 'unknown';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  /** PLN customer ID (IDPEL). Always treated as a string. */
  idpel: string | null;
  customerType: string | null;
  tariff: string | null;
  /** Nominal power in VA. Always treated as a string. */
  power: string | null;
  region: string | null;
  ulp: string | null;
  status: 'active' | CustomerStatus | 'blocked' | 'opted_out';
  whatsappStatus?: WhatsAppStatus;
  whatsappOptIn?: boolean;
  company: string | null;
  address: string | null;
  notes: string | null;
  groupIds: string[];
  lastContact: string | null;
  createdAt: string;
  custom_fields: Record<string, string>;
}

export const CUSTOMER_STATUSES: CustomerStatus[] = ['active', 'inactive'];

export const WHATSAPP_STATUSES: WhatsAppStatus[] = ['eligible', 'opted_out', 'blocked', 'invalid', 'unknown'];

export const CUSTOMER_TYPES = ['Residential', 'Business', 'Industrial', 'Government', 'Social'];

export interface ContactGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  createdAt: string;
  /** Number of contacts assigned to this group (from the backend contacts_count). */
  contactsCount?: number;
}

export type TemplateCategory = string;

export interface Template {
  id: number;
  name: string;
  code: string;
  category: TemplateCategory;
  language: string;
  content: string;
  variables: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateMeta {
  categories: string[];
  languages: string[];
  variables: string[];
}

export type AccountStatus = 'connected' | 'connecting' | 'disconnected' | 'logged_out';

/**
 * A WhatsApp sending account managed via Baileys.
 *
 * Connection config (managed in Add/Connect):
 *   name (user-editable), phone (filled once connected)
 *
 * Connection lifecycle (application-managed):
 *   status, is_default, last_connected_at, last_disconnected_at
 */
export interface WhatsAppAccount {
  id: string;
  name: string;
  /** Stored/displayed as a string. Empty until the account is connected. */
  phone: string | null;
  status: AccountStatus;
  is_default: boolean;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WhatsAppAccountInput {
  name: string;
}

/**
 * Raw payloads pushed by the backend Socket.IO /whatsapp namespace.
 * `status` is emitted upper-case by the server; normalize when consuming.
 */
export interface WaQrPayload {
  accountId: string;
  qr: string;
  image?: string;
}

export interface WaStatusPayload {
  accountId: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'LOGGED_OUT';
}

export interface WaConnectedPayload {
  accountId: string;
  phone: string;
  status: 'CONNECTED';
}

export interface WaDisconnectedPayload {
  accountId: string;
  reason: string;
  status: 'DISCONNECTED';
}

export type QueueStatus = 'Pending' | 'Processing' | 'Sent' | 'Failed' | 'Cancelled';

export interface QueueItem {
  id: string;
  recipient: string;
  phone: string;
  campaignId: string;
  campaignName: string;
  senderName: string;
  status: QueueStatus;
  scheduledAt: string;
  attempts: number;
}

export type MessageLogStatus = 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';

export interface MessageLog {
  id: string;
  time: string;
  recipient: string;
  phone: string;
  campaignId: string;
  campaignName: string;
  senderName: string;
  message: string;
  status: MessageLogStatus;
  error: string | null;
}

export type RecipientStatus = 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';

export interface CampaignRecipient {
  id: string;
  name: string;
  phone: string;
  status: RecipientStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  error: string | null;
}

export type Role = 'Owner' | 'Admin' | 'Manager' | 'Operator' | 'Viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Invited' | 'Disabled';
  lastLogin: string | null;
  avatarColor: string;
}

export type ActivityModule =
  | 'Campaign'
  | 'Contact'
  | 'Template'
  | 'WhatsApp'
  | 'Team'
  | 'Settings'
  | 'Auth';

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  module: ActivityModule;
  date: string;
}

export type NotificationType = 'Success' | 'Error' | 'Warning' | 'Info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface ToastPayload {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarColor?: string;
  role: Role;
}

export interface Settings {
  general: {
    companyName: string;
    timezone: string;
    language: string;
  };
  whatsapp: {
    defaultSenderId: string;
    rateLimitPerMin: number;
    retryLimit: number;
    delayBetweenMs: number;
  };
  notifications: {
    campaignCompleted: boolean;
    campaignFailed: boolean;
    connectionError: boolean;
    lowQuota: boolean;
  };
  billing: {
    messagesUsed: number;
    messageQuota: number;
  };
}

export interface DashboardSummary {
  totalContacts: number;
  contactsGrowth: number;
  campaigns: number;
  campaignsGrowth: number;
  messagesSent: number;
  messagesGrowth: number;
  deliveryRate: number;
  deliveryGrowth: number;
}

export interface CampaignPerformancePoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface MessageStatSlice {
  name: string;
  value: number;
}