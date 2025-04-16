import { IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateGenreSongDto {
  @IsNotEmpty()
  @IsMongoId()
  genreId: string;

  @IsNotEmpty()
  @IsMongoId()
  songId: string;
}
