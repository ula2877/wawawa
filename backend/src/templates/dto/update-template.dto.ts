import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

const present = (_object: unknown, value: unknown) => value !== undefined;

/**
 * Mirrors UpdateTemplateRequest: every field is optional but, once present,
 * must satisfy the same rules as create. Guarded fields (code, usage_count,
 * variables, created_at, updated_at) are stripped by the ValidationPipe.
 */
export class UpdateTemplateDto {
  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 150 })
  name?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'category', required: true, max: 100 })
  category?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'language', required: true, max: 50 })
  language?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'content', required: true })
  content?: string;
}