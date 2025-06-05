import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { Song, SongSchema } from './schemas/song.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Follower, FollowerSchema } from '../followers/schemas/follower.schema';
import { GenreSongModule } from '../genre-song/genre-song.module';
import { GenresModule } from '../genres/genres.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: User.name, schema: UserSchema },
      { name: Follower.name, schema: FollowerSchema }, // Add Follower model
    ]),
    FirebaseModule,
    JwtModule.register({}), // Register JwtModule to provide JwtService
    GenreSongModule, // Import GenreSongModule to use its service
    GenresModule, // <-- Add this line
  ],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
