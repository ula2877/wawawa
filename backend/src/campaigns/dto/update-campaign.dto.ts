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
 * Edits allowed on a DRAFT campaign. Once a campaign leaves DRAFT the target
 * list and template snapshot are frozen, so only the display fields (name,
 * description, scheduled_at) remain editable.
 *
 * Providing `contact_ids` and/or `group_ids` re-resolves the target list and
 * replaces the recipient snapshots in a single transaction.
 */
export class UpdateCampaignDto {
  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'name', max: 191 })
  name?: string;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'description', max: 1000 })
  description?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelStringRule({ attribute: 'content', max: 5000 })
  content?: string | null;

  @Transform(({ value }) => isEmptyStringToNull(value))
  @IsLaravelDate({ attribute: 'scheduled at' })
  scheduled_at?: string | null;

  @IsLaravelArrayOfIds({ attribute: 'contact ids' })
  contact_ids?: number[];

  @IsLaravelArrayOfIds({ attribute: 'group ids' })
  group_ids?: number[];

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