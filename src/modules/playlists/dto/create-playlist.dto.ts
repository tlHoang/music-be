import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsString,
} from 'class-validator';

export class CreatePlaylistDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsArray()
  songs?: string[];

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  visibility?: string;

  @IsOptional()
  @IsString()
  cover?: string;
}
