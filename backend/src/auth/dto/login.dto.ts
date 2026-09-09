import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'The email must be a valid email address.' })
  email: string;

  @IsString({ message: 'The password must be a string.' })
  @IsNotEmpty({ message: 'The password field is required.' })
  password: string;
}