import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export class CreateFlagReportDto {
  @IsEnum([
    'INAPPROPRIATE_CONTENT',
    'COPYRIGHT_INFRINGEMENT',
    'SPAM',
    'HARASSMENT',
    'OTHER',
  ])
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}
