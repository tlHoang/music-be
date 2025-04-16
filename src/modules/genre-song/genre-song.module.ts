import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GenreSongService } from './genre-song.service';
import { GenreSongController } from './genre-song.controller';
import { GenreSong, GenreSongSchema } from './schemas/genre-song.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GenreSong.name, schema: GenreSongSchema },
    ]),
  ],
  controllers: [GenreSongController],
  providers: [GenreSongService],
  exports: [GenreSongService],
})
export class GenreSongModule {}
