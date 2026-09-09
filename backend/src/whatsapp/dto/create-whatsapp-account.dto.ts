import { Transform } from 'class-transformer';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

/**
 * Creating a WhatsApp account never triggers a connection: the status stays
 * DISCONNECTED and `phone` stays empty until a successful connect.
 */
export class CreateWhatsAppAccountDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 150 })
  name: string;
}