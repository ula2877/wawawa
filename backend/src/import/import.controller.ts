import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ImportMulterExceptionFilter } from './import-multer.filter.js';
import {
  ImportService,
  MAX_IMPORT_BYTES,
  type UploadedCsvFile,
} from './import.service.js';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMPORT_BYTES },
    }),
  )
  @UseFilters(ImportMulterExceptionFilter)
  import(
    @UploadedFile() file: UploadedCsvFile | undefined,
    @Body('mapping') mapping?: string,
  ) {
    return this.importService.import(file, mapping);
  }
}