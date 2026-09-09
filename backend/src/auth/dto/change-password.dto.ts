import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'The current password must be a string.' })
  @IsNotEmpty({ message: 'The current password field is required.' })
  current_password: string;

  @IsString({ message: 'The new password must be a string.' })
  @IsNotEmpty({ message: 'The new password field is required.' })
  @MinLength(8, { message: 'The new password must be at least 8 characters.' })
  new_password: string;

  @IsString({ message: 'The new password confirmation must be a string.' })
  @IsNotEmpty({ message: 'The new password confirmation field is required.' })
  new_password_confirmation: string;
}