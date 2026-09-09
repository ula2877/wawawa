import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class LogActivityDto {
  @IsNotEmpty()
  @IsString()
  user: string;

  @IsNotEmpty()
  @IsString()
  action: string;

  @IsNotEmpty()
  @IsIn(['Campaign', 'Contact', 'Template', 'WhatsApp', 'Team', 'Settings', 'Auth'])
  module: string;
}
