import { Transform } from 'class-transformer';
import { IsArray, IsInt, ValidateIf } from 'class-validator';
import {
  IsLaravelDate,
  IsLaravelEmail,
  IsLaravelNullableInteger,
  IsLaravelStringRule,
  isEmptyStringToNull,
  toNullableNumber,
} from './rules.js';

const PHONE_PATTERN = /^\+?\d[\d\s-]*$/;
const GROUP_IDS = 'The selected group ids is invalid.';
const present = (_object: unknown, value: unknown) => value !== undefined;

function toGroupIds(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (typeof item === 'number') {
      return item;
    }

    if (typeof item === 'string' && /^-?\d+$/.test(item)) {
      return Number(item);
    }

    return item;
  });
}

export class UpdateContactDto {
  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'idpel', required: true, max: 30 })
  idpel?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 150 })
  name?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({
    attribute: 'phone',
    required: true,
    max: 20,
    regex: PHONE_PATTERN,
    regexMessage: 'The phone format is invalid.',
  })
  phone?: string;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelEmail({ attribute: 'email' })
  email?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'customer type', max: 50 })
  customer_type?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'tariff', max: 20 })
  tariff?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => toNullableNumber(value))
  @IsLaravelNullableInteger({ attribute: 'power' })
  power?: number | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'region', max: 100 })
  region?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'ulp', max: 100 })
  ulp?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelDate({ attribute: 'last contact at' })
  last_contact_at?: string | null;

  @ValidateIf(present)
  @Transform(({ value }) => toGroupIds(value))
  @IsArray({ message: 'The group ids must be an array.' })
  @IsInt({ each: true, message: GROUP_IDS })
  group_ids?: number[];
}