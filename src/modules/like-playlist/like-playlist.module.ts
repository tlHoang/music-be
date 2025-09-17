import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikePlaylistService } from './like-playlist.service';
import { LikePlaylistController } from './like-playlist.controller';
import {
  LikePlaylist,
  LikePlaylistSchema,
} from './schemas/like-playlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LikePlaylist.name, schema: LikePlaylistSchema },
    ]),
  ],
  controllers: [LikePlaylistController],
  providers: [LikePlaylistService],
  exports: [LikePlaylistService],
})
export class LikePlaylistModule {}
