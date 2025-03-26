import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  // @IsStrongPassword()
  password: string;
}
