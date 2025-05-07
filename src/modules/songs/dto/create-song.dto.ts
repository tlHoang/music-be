import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUrl,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSongDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  // @IsOptional()
  // duration?: number;

  // @IsOptional()
  // uploadDate?: Date;

  @IsOptional()
  @IsString()
  lyrics?: string;

  // @IsOptional()
  // @IsUrl()
  // audioUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @IsOptional()
  @IsEnum(['PRIVATE', 'PUBLIC'])
  visibility?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @Transform(({ value }) => {
    // Handle different formats (string, array, single value)
    if (typeof value === 'string') {
      try {
        // Try to parse as JSON string array
        return JSON.parse(value);
      } catch (e) {
        // If not JSON, treat as single ID
        return [value];
      }
    }
    // If already an array, return as is
    if (Array.isArray(value)) {
      return value;
    }
    // If single value, make it an array
    return [value];
  })
  genres?: string[];

  // @IsNotEmpty()
  // userId: string;
}
