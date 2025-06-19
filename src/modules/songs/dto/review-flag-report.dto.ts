import { IsString, IsEnum, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class ReviewFlagReportDto {
  @IsEnum(['REVIEWED', 'DISMISSED'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Review notes cannot exceed 500 characters' })
  reviewNotes?: string;

  @IsOptional()
  @IsBoolean()
  flagSong?: boolean; // Whether to flag the song as inappropriate
}
