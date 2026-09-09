import {
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MediaMulterExceptionFilter } from './media-multer.filter.js';
import {
  MAX_MEDIA_BYTES,
  MediaService,
  mediaFileFilter,
  type UploadedMediaFile,
} from './media.service.js';

/**
 * Attachment upload endpoint. Returns server-side media metadata the campaign
 * create/update payloads persist onto the Campaign row.
 */
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_MEDIA_BYTES },
      fileFilter: mediaFileFilter,
    }),
  )
  @UseFilters(MediaMulterExceptionFilter)
  upload(@UploadedFile() file: UploadedMediaFile | undefined) {
    return this.mediaService.persist(file);
  }
}