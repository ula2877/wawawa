import { IsOptional } from 'class-validator';

export class QueryCampaignsDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  sort_by?: string;

  @IsOptional()
  sort_direction?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  per_page?: string;
}