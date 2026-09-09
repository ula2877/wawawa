import { IsOptional } from 'class-validator';

export class QueryCampaignRecipientsDto {
  @IsOptional()
  page?: string;

  @IsOptional()
  per_page?: string;
}