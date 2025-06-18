import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowPlaylistService } from './follow-playlist.service';
import { FollowPlaylistController } from './follow-playlist.controller';
import {
  FollowPlaylist,
  FollowPlaylistSchema,
} from './schemas/follow-playlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowPlaylist.name, schema: FollowPlaylistSchema },
    ]),
  ],
  controllers: [FollowPlaylistController],
  providers: [FollowPlaylistService],
  exports: [FollowPlaylistService],
})
export class FollowPlaylistModule {}
