import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { Song, SongSchema } from './schemas/song.schema';
import { FlagReport, FlagReportSchema } from './schemas/flag-report.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Follower, FollowerSchema } from '../followers/schemas/follower.schema';
import { Genre, GenreSchema } from '../genres/schemas/genre.schema';
import {
  GenreSong,
  GenreSongSchema,
} from '../genre-song/schemas/genre-song.schema';
import { GenresModule } from '../genres/genres.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: FlagReport.name, schema: FlagReportSchema },
      { name: User.name, schema: UserSchema },
      { name: Follower.name, schema: FollowerSchema }, // Add Follower model
      { name: Genre.name, schema: GenreSchema }, // Add Genre model for population
      { name: GenreSong.name, schema: GenreSongSchema }, // Add GenreSong model
    ]),
    FirebaseModule,
    JwtModule.register({}), // Register JwtModule to provide JwtService
    GenresModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
