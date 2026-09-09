import { IsNotEmpty } from 'class-validator';
import { IsLaravelDate } from '../../contacts/dto/rules.js';

/**
 * Payload to confirm a draft campaign for delivery at a future date. The
 * campaign moves DRAFT -> SCHEDULED; a background scheduler promotes it to
 * RUNNING once `scheduled_at` passes.
 */
export class ScheduleCampaignDto {
  @IsNotEmpty({ message: 'Scheduled at is required.' })
  @IsLaravelDate({ attribute: 'scheduled at' })
  scheduled_at: string;
}