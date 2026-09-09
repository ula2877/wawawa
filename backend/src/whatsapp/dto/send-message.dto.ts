import { Transform } from 'class-transformer';
import {
  IsLaravelStringRule,
  isEmptyStringToNull,
} from '../../contacts/dto/rules.js';

/**
 * Incoming message for a WhatsApp account. Recipient may be a phone number
 * (local or international) or an existing WhatsApp JID; normalization happens
 * in the manager right before sending.
 */
export class SendMessageDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'recipient', required: true, max: 100 })
  recipient: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'content', required: true, max: 4096 })
  content: string;
}