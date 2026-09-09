import { Transform } from 'class-transformer';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

/**
 * Mirrors StoreTemplateRequest. Guarded fields (code, usage_count,
 * variables, created_at, updated_at) are never accepted: the global
 * ValidationPipe runs with whitelist:true and strips them, matching the
 * Laravel FormRequest validated() override.
 */
export class CreateTemplateDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 150 })
  name: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'category', required: true, max: 100 })
  category: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'language', required: true, max: 50 })
  language: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'content', required: true })
  content: string;
}