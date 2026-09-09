import { MulterError } from 'multer';
import {
  Catch,
  UnprocessableEntityException,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';

/**
 * Maps multer upload failures for campaign media to stable 422 payloads so
 * the frontend can show a single actionable message.
 */
@Catch(MulterError)
export class MediaMulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, _host: ArgumentsHost) {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      throw new UnprocessableEntityException({
        message: 'The file must not be larger than 64MB.',
        errors: { file: ['The file must not be larger than 64MB.'] },
      });
    }

    throw new UnprocessableEntityException({
      message: 'The media file could not be uploaded.',
      errors: { file: ['The media file could not be uploaded.'] },
    });
  }
}