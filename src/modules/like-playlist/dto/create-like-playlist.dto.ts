import { IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateLikePlaylistDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsMongoId()
  playlistId: string;
}
