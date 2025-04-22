import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowersService } from './followers.service';
import { FollowersController } from './followers.controller';
import { Follower, FollowerSchema } from './schemas/follower.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Follower.name, schema: FollowerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}), // Register JwtModule to provide JwtService
  ],
  controllers: [FollowersController],
  providers: [FollowersService],
  exports: [FollowersService],
})
export class FollowersModule {}
