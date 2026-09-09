import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

const present = (_object: unknown, value: unknown) => value !== undefined;

export class UpdateGroupDto {
  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 100 })
  name?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'slug', max: 120 })
  slug?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'description' })
  description?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'color', max: 30 })
  color?: string | null;
}