import { ArrowLeft, MoreVertical, Phone, Video, Check, CheckCheck, Image as ImageIcon, FileText, Music, Film } from 'lucide-react';
import { cx } from '@/utils/format';
import type { Campaign } from '@/types';

const MEDIA_ICONS = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  audio: Music,
  none: null,
} as const;

export interface WhatsAppPreviewProps {
  senderName?: string;
  recipientName?: string;
  message: string;
  mediaType?: Campaign['mediaType'];
  mediaName?: string;
  footer?: string;
  buttons?: { label: string }[];
  timestamp?: string;
}

export function WhatsAppPreview({
  senderName = 'Marketing 01',
  recipientName = 'Budi',
  message,
  mediaType = 'none',
  mediaName,
  footer,
  buttons = [],
  timestamp = '10:32',
}: WhatsAppPreviewProps) {
  const MediaIcon = MEDIA_ICONS[mediaType] ?? null;

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-surface-200 shadow-pop dark:border-surface-800" aria-label="WhatsApp message preview">
      <div className="flex items-center gap-3 bg-[#075E54] px-3 py-2.5 text-white">
        <ArrowLeft className="h-4 w-4 opacity-90" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
          {recipientName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{recipientName}</p>
          <p className="text-[11px] text-white/70">online</p>
        </div>
        <Video className="h-[18px] w-[18px] opacity-90" />
        <Phone className="h-4 w-4 opacity-90" />
        <MoreVertical className="h-[18px] w-[18px] opacity-90" />
      </div>

      <div className="bg-[#ECE5DD] p-3 dark:bg-surface-800">
        <div className="mx-auto max-w-[42ch]">
          <div
            className={cx(
              'ml-auto rounded-lg rounded-tr-none border-l-4 border-l-surface-200 bg-white px-3 py-2 shadow-sm dark:border-l-surface-600 dark:bg-surface-700',
            )}
          >
            {MediaIcon && (
              <div className="mb-1.5 flex items-center gap-2 rounded-md bg-surface-100 px-2.5 py-2 text-surface-700 dark:bg-surface-600 dark:text-surface-100">
                <MediaIcon className="h-4 w-4" />
                <span className="truncate text-xs font-medium">{mediaName ?? 'media-file.jpg'}</span>
              </div>
            )}
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-surface-800 dark:text-surface-100">{message}</p>
            {footer && <p className="mt-1.5 text-center text-[11px] text-surface-500 dark:text-surface-400">{footer}</p>}
            {buttons.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {buttons.map((b, i) => (
                  <div key={i} className="rounded-md bg-whatsapp-500 px-3 py-1.5 text-center text-xs font-semibold text-white">
                    {b.label}
                  </div>
                ))}
              </div>
            )}
            <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-surface-400 dark:text-surface-500">
              <span>{timestamp}</span>
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
            </span>
          </div>

          <div className="my-1.5 text-center text-[10px] text-surface-400 dark:text-surface-500">
            Messages sent to WhatsApp numbers are end-to-end encrypted
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5 dark:bg-surface-700">
            <span className="flex-1 text-[13px] text-surface-400 dark:text-surface-500">Type a message</span>
            <Check className="h-4 w-4 text-surface-400 dark:text-surface-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#075E54] px-4 py-2 text-[11px] text-white/80">
        <span className="inline-flex items-center gap-1 font-medium text-white">
          <CheckCheck className="h-3.5 w-3.5" /> Sent from {senderName}
        </span>
      </div>
    </div>
  );
}