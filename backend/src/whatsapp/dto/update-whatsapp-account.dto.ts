import { Transform } from 'class-transformer';
import { IsBoolean, ValidateIf } from 'class-validator';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

const present = (_object: unknown, value: unknown) => value !== undefined;

/**
 * Update DTO. `name` is a plain rename; `isDefault` toggles the single
 * default account (enforced transactionally in the service). Declared before
 * connect, `isDefault` stays dormant unless updated here.
 */
export class UpdateWhatsAppAccountDto {
  @ValidateIf(present)
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 150 })
  name?: string;

  @ValidateIf(present)
  @Transform(({ value }) =>
    value === undefined || value === null
      ? value
      : value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean({ message: 'The isDefault field must be a boolean.' })
  isDefault?: boolean;
}