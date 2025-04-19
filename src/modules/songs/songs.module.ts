import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { Song, SongSchema } from './schemas/song.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: User.name, schema: UserSchema }, // Add User model
    ]),
    FirebaseModule,
    JwtModule.register({}), // Register JwtModule to provide JwtService
  ],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
