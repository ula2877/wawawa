import { IsOptional } from 'class-validator';

/**
 * Loose query DTO mirroring `$request->query()` in the Laravel controller.
 * Sorting/pagination defaults and capping live in the service.
 */
export class QueryTemplatesDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  category?: string;

  @IsOptional()
  language?: string;

  @IsOptional()
  sort_by?: string;

  @IsOptional()
  sort_direction?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  per_page?: string;
}