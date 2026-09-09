import { MulterError } from 'multer';
import {
  Catch,
  UnprocessableEntityException,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';

/**
 * Maps multer upload failures (e.g. file larger than 50MB) to the exact
 * Laravel validation message for ImportContactsRequest.
 */
@Catch(MulterError)
export class ImportMulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, _host: ArgumentsHost) {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      throw new UnprocessableEntityException({
        message: 'The file must not be larger than 50MB.',
        errors: {
          file: ['The file must not be larger than 50MB.'],
        },
      });
    }

    throw new UnprocessableEntityException({
      message: 'A CSV file is required.',
      errors: {
        file: ['A CSV file is required.'],
      },
    });
  }
}