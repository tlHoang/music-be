import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongPlaylistService } from './song-playlist.service';
import { SongPlaylistController } from './song-playlist.controller';
import {
  SongPlaylist,
  SongPlaylistSchema,
} from './schemas/song-playlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SongPlaylist.name, schema: SongPlaylistSchema },
    ]),
  ],
  controllers: [SongPlaylistController],
  providers: [SongPlaylistService],
  exports: [SongPlaylistService],
})
export class SongPlaylistModule {}
