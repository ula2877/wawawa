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

export class CreateContactDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'idpel', required: true, max: 30 })
  idpel: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 150 })
  name: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({
    attribute: 'phone',
    required: true,
    max: 20,
    regex: PHONE_PATTERN,
    regexMessage: 'The phone format is invalid.',
  })
  phone: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelEmail({ attribute: 'email' })
  email: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'customer type', max: 50 })
  customer_type: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'tariff', max: 20 })
  tariff: string | null;

  @Transform(({ value }) => toNullableNumber(value))
  @IsLaravelNullableInteger({ attribute: 'power' })
  power: number | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'region', max: 100 })
  region: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'ulp', max: 100 })
  ulp: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelDate({ attribute: 'last contact at' })
  last_contact_at: string | null;

  @Transform(({ value }) => toGroupIds(value))
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsArray({ message: 'The group ids must be an array.' })
  @IsInt({ each: true, message: GROUP_IDS })
  group_ids?: number[];
}