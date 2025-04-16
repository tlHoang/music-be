import { IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateSongPlaylistDto {
  @IsNotEmpty()
  @IsMongoId()
  songId: string;

  @IsNotEmpty()
  @IsMongoId()
  playlistId: string;
}
