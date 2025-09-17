import { IsNotEmpty } from 'class-validator';

export class CreateLikeDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  songId: string;
}
