import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for reordering songs in a playlist
 */
export class ReorderSongsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  songIds: string[];
}
