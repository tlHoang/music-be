import { IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateFollowPlaylistDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsMongoId()
  playlistId: string;
}
