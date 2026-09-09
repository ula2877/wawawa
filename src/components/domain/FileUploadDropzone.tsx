import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, Image as ImageIcon, Film, FileText, Music, X, Loader2 } from 'lucide-react';
import { cx } from '@/utils/format';
import type { Campaign } from '@/types';

export type MediaType = Exclude<Campaign['mediaType'], 'none'>;

const TYPE_ICONS: Record<Campaign['mediaType'], React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  audio: Music,
  none: FileIcon,
};

/** Attachment metadata handed to the parent when a file is selected. */
export interface MediaAttachment {
  mediaType: MediaType;
  mediaName: string;
  mediaPath?: string;
  mediaMimetype?: string;
  mediaSize?: number;
}

type UploadFn = (file: File) => Promise<MediaAttachment>;

interface FileUploadDropzoneProps {
  onUploaded: (attachment: MediaAttachment) => void;
  onRemove?: () => void;
  onError?: (message: string) => void;
  accept?: string;
  /** Real HTTP upload. When omitted the dropzone only stages the file name. */
  upload?: UploadFn;
  /** Pre-existing attachment (e.g. when editing a campaign that has media). */
  value?: { mediaType: MediaType; mediaName?: string } | null;
}

export function FileUploadDropzone({
  onUploaded,
  onRemove,
  onError,
  accept,
  upload,
  value,
}: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<{ name: string; type: MediaType } | null>(() =>
    value?.mediaName ? { name: value.mediaName, type: value.mediaType } : null,
  );

  useEffect(() => {
    setFile(value?.mediaName ? { name: value.mediaName, type: value.mediaType } : null);
  }, [value?.mediaType, value?.mediaName]);

  const handleFiles = async (files: FileList | null) => {
    const target = files?.[0];
    if (!target) return;
    const extension = target.name.split('.').pop()?.toLowerCase() ?? '';
    let type: MediaType = 'document';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) type = 'image';
    else if (['mp4', 'webm', 'mov', 'mkv', 'mpeg'].includes(extension)) type = 'video';
    else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) type = 'audio';

    if (upload) {
      setUploading(true);
      try {
        const result = await upload(target);
        setFile({ name: result.mediaName, type: result.mediaType });
        onUploaded(result);
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
      return;
    }

    setUploading(true);
    setFile({ name: target.name, type });
    setTimeout(() => {
      setUploading(false);
      onUploaded({ mediaType: type, mediaName: target.name });
    }, 900);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-whatsapp-500 bg-whatsapp-500/5'
            : 'border-surface-300 hover:border-whatsapp-400 dark:border-surface-700',
        )}
        aria-label="Upload media file"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-whatsapp-500" />
        ) : (
          <UploadCloud className="h-8 w-8 text-surface-400" />
        )}
        <p className="mt-3 text-sm font-medium text-surface-700 dark:text-surface-200">
          {uploading ? 'Uploading file...' : 'Drag & drop your file here'}
        </p>
        <p className="mt-1 text-xs text-surface-400">
          or <span className="font-medium text-whatsapp-600 dark:text-whatsapp-400">browse files</span> — JPG, PNG, MP4,
          PDF, MP3 up to 64MB
        </p>
      </div>
      {file && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 dark:border-surface-700 dark:bg-surface-800">
          {(() => {
            const Icon = TYPE_ICONS[file.type];
            return <Icon className="h-5 w-5 text-whatsapp-500" />;
          })()}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-100">{file.name}</p>
            <p className="text-xs text-surface-400">
              {uploading ? 'Uploading...' : 'Ready to attach'} · {file.type}
            </p>
          </div>
          <button
            onClick={() => {
              setFile(null);
              onRemove?.();
            }}
            className="rounded p-1 text-surface-400 hover:text-surface-600"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}