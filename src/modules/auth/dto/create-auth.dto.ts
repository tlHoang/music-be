import {
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  // @IsStrongPassword()
  password: string;
}

export class CodeActivateDto {
  @IsNotEmpty()
  _id: string;

  @IsNotEmpty()
  code: string;
}

export class ResendCodeDto {
  @IsOptional()
  _id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
