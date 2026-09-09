import { IsIn, IsOptional } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsIn(['Admin', 'Operator'])
  role?: string;

  @IsOptional()
  @IsIn(['Active', 'Invited', 'Disabled'])
  status?: string;
}
