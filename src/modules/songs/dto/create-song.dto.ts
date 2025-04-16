import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUrl,
} from 'class-validator';

export class CreateSongDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  duration?: number;

  @IsOptional()
  uploadDate?: Date;

  @IsOptional()
  @IsString()
  lyrics?: string;

  @IsNotEmpty()
  @IsUrl()
  audioUrl: string;

  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @IsOptional()
  @IsEnum(['PRIVATE', 'PUBLIC'])
  visibility?: string;

  @IsNotEmpty()
  userId: string;
}
