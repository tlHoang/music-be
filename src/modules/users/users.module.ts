import { Module } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { UsersController } from '@/modules/users/users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { Follower, FollowerSchema } from '../followers/schemas/follower.schema';
import { Song, SongSchema } from '../songs/schemas/song.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Follower.name, schema: FollowerSchema },
      { name: Song.name, schema: SongSchema },
    ]),
    JwtModule.register({}), // Register JwtModule to provide JwtService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
