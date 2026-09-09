import { IsOptional } from 'class-validator';

export class QueryContactsDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  customer_type?: string;

  @IsOptional()
  tariff?: string;

  @IsOptional()
  power?: string;

  @IsOptional()
  region?: string;

  @IsOptional()
  ulp?: string;

  @IsOptional()
  group_id?: string;

  @IsOptional()
  sort_by?: string;

  @IsOptional()
  sort_direction?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  per_page?: string;
}