import {
  Injectable,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export const MAX_MEDIA_BYTES = 64 * 1024 * 1024;

export type MediaType = 'image' | 'video' | 'document' | 'audio';

const EXTENSIONS_BY_TYPE: Record<string, MediaType> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  mkv: 'video',
  mpeg: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  aac: 'audio',
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  xls: 'document',
  xlsx: 'document',
  ppt: 'document',
  pptx: 'document',
  txt: 'document',
  zip: 'document',
  rar: 'document',
  csv: 'document',
};

export interface UploadedMediaFile {
  originalname?: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

export interface StoredMediaResource {
  media_path: string;
  media_type: MediaType;
  media_name: string;
  media_mimetype: string;
  media_size: number;
}

function fileExtension(fileName: string): string {
  return path.extname(fileName ?? '').slice(1).toLowerCase();
}

export function detectMediaType(fileName: string): MediaType | null {
  return EXTENSIONS_BY_TYPE[fileExtension(fileName)] ?? null;
}

/**
 * Multer fileFilter guard. Rejects extensions that are not attachable media
 * before the file is read into memory.
 */
export function mediaFileFilter(
  _request: object,
  file: { originalname: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const type = detectMediaType(file.originalname);
  if (!type) {
    callback(
      new UnprocessableEntityException({
        message:
          'The media type is invalid. Only images, video, audio and document files are allowed.',
        errors: { file: ['The media type is invalid.'] },
      }),
      false,
    );
    return;
  }
  callback(null, true);
}

/**
 * Stores campaign attachment files on disk and hands back the metadata that
 * gets persisted on the Campaign row. Files are stored under
 * `storage/campaign-media/<uuid>.<ext>` and referenced by a path relative to
 * the backend working directory so the worker can resolve them for delivery.
 */
@Injectable()
export class MediaService implements OnModuleInit {
  private readonly uploadRoot: string;

  constructor(config: ConfigService) {
    const relative = config.get<string>('MEDIA_UPLOAD_DIR') ?? 'storage/campaign-media';
    this.uploadRoot = path.resolve(process.cwd(), relative);
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.uploadRoot, { recursive: true });
  }

  async persist(file: UploadedMediaFile | undefined): Promise<StoredMediaResource> {
    if (!file || !file.originalname || file.buffer.length === 0) {
      throw new UnprocessableEntityException({
        message: 'A media file is required.',
        errors: { file: ['A media file is required.'] },
      });
    }

    const type = detectMediaType(file.originalname);
    if (!type) {
      throw new UnprocessableEntityException({
        message:
          'The media type is invalid. Only images, video, audio and document files are allowed.',
        errors: { file: ['The media type is invalid.'] },
      });
    }

    const filename = `${randomUUID()}.${fileExtension(file.originalname)}`;
    await fs.writeFile(path.join(this.uploadRoot, filename), file.buffer);

    const relative = path.relative(process.cwd(), path.join(this.uploadRoot, filename));

    return {
      media_path: relative.split(path.sep).join('/'),
      media_type: type,
      media_name: file.originalname,
      media_mimetype: file.mimetype ?? '',
      media_size: file.size,
    };
  }
}