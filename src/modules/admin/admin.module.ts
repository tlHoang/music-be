import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Song, SongSchema } from '../songs/schemas/song.schema';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { Follower, FollowerSchema } from '../followers/schemas/follower.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Song.name, schema: SongSchema },
      { name: Playlist.name, schema: PlaylistSchema },
      { name: Follower.name, schema: FollowerSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
