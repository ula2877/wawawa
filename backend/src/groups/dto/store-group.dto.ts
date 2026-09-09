import { Transform } from 'class-transformer';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

export class StoreGroupDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 100 })
  name: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'slug', max: 120 })
  slug?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'description' })
  description?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'color', max: 30 })
  color?: string | null;
}