import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'The name must be a string.' })
  @IsNotEmpty({ message: 'The name field is required.' })
  @MaxLength(255, { message: 'The name must not be greater than 255 characters.' })
  name: string;

  @IsEmail({}, { message: 'The email must be a valid email address.' })
  email: string;
}