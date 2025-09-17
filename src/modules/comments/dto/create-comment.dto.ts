import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  songId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
