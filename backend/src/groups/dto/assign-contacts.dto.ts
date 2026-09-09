import { Transform } from 'class-transformer';
import { IsArray, IsInt } from 'class-validator';

const CONTACT_IDS = 'The selected contact ids is invalid.';

function toContactIds(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (typeof item === 'number') {
      return item;
    }

    if (typeof item === 'string' && /^\d+$/.test(item)) {
      return Number(item);
    }

    return item;
  });
}

export class AssignContactsDto {
  @Transform(({ value }) => toContactIds(value))
  @IsArray({ message: 'The contact ids must be an array.' })
  @IsInt({ each: true, message: CONTACT_IDS })
  contact_ids: number[];
}