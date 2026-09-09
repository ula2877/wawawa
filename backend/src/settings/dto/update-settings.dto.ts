import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  defaultSenderId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'The rate limit must be at least 1.' })
  rateLimitPerMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'The retry limit cannot be negative.' })
  retryLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'The delay cannot be negative.' })
  delayBetweenMs?: number;

  @IsOptional()
  @IsBoolean()
  notifyCampaignCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCampaignFailed?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyConnectionError?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyLowQuota?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'The message quota cannot be negative.' })
  messageQuota?: number;
}