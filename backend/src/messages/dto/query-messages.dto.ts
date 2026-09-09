import { IsOptional } from 'class-validator';

export class QueryMessagesDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  campaign_id?: string;

  @IsOptional()
  account_id?: string;

  @IsOptional()
  from?: string;

  @IsOptional()
  to?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  per_page?: string;
}