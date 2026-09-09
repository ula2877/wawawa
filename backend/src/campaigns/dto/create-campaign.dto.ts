import { Transform } from 'class-transformer';
import {
  IsLaravelArrayOfIds,
  IsLaravelDate,
  IsLaravelNullableInteger,
  IsLaravelStringRule,
  isEmptyStringToNull,
  toNullableNumber,
} from '../../contacts/dto/rules.js';

/**
 * Payload to draft a new campaign. The target list (contact_ids + group_ids) is
 * resolved and snapshotted at creation time; the message body is copied into
 * `templateContentSnapshot` so later edits to the template cannot alter what
 * this campaign actually sends. When `content` is provided it wins over the
 * template body (the message was customized on the create screen).
 */
export class CreateCampaignDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', required: true, max: 191 })
  name: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'description', max: 1000 })
  description?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'whatsapp account id', required: true })
  whatsapp_account_id: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelNullableInteger({ attribute: 'template id' })
  template_id?: number | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'content', max: 5000 })
  content?: string | null;

  @IsLaravelArrayOfIds({ attribute: 'contact ids' })
  contact_ids?: number[];

  @IsLaravelArrayOfIds({ attribute: 'group ids' })
  group_ids?: number[];

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelDate({ attribute: 'scheduled at' })
  scheduled_at?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'media path', max: 1000 })
  media_path?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({
    attribute: 'media type',
    regex: /^(image|video|document|audio)$/,
    regexMessage: 'The selected media type is invalid.',
  })
  media_type?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'media name', max: 191 })
  media_name?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'media mime type', max: 191 })
  media_mimetype?: string | null;

  @Transform(({ value }) => toNullableNumber(value))
  @IsLaravelNullableInteger({ attribute: 'media size' })
  media_size?: number | null;
}