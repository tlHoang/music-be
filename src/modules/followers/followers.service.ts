import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Follower } from './schemas/follower.schema';
import { CreateFollowerDto } from './dto/create-follower.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class FollowersService {
  constructor(
    @InjectModel(Follower.name) private readonly followerModel: Model<Follower>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(createFollowerDto: CreateFollowerDto) {
    // Check if already following
    const existingFollow = await this.followerModel.findOne({
      followerId: createFollowerDto.followerId.toString(),
      followingId: createFollowerDto.followingId.toString(),
    });

    if (existingFollow) {
      return { success: true, message: 'Already following this user' };
    }

    // Create the follow relationship
    await this.followerModel.create({
      followerId: createFollowerDto.followerId.toString(),
      followingId: createFollowerDto.followingId.toString(),
    });

    return { success: true, message: 'Successfully followed user' };
  }

  async remove(followedId: string, currentUserId: string) {
    const result = await this.followerModel.findOneAndDelete({
      followerId: currentUserId.toString(),
      followingId: followedId.toString(),
    });

    if (!result) {
      throw new NotFoundException('Follow relationship not found');
    }

    return { success: true, message: 'Successfully unfollowed user' };
  }

  async findFollowers(userId: string, currentUserId?: string) {
    // Find all followers of the provided user ID
    const followers = await this.followerModel
      .find({ followingId: userId.toString() })
      .populate('followerId', 'name email avatar')
      .exec();

    // Transform to return user objects with isFollowing flag
    const followerUsers = await Promise.all(
      followers.map(async (follow) => {
        const user = follow.followerId as any;

        // If current user is authenticated, check if they follow this user
        let isFollowing = false;
        if (currentUserId) {
          const followCheck = await this.followerModel.findOne({
            followerId: currentUserId.toString(),
            followingId: user._id.toString(),
          });
          isFollowing = !!followCheck;
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isFollowing,
        };
      }),
    );

    return followerUsers;
  }

  async findFollowing(userId: string, currentUserId?: string) {
    // Find all users that the provided user ID follows
    const following = await this.followerModel
      .find({ followerId: userId.toString() })
      .populate('followingId', 'name email avatar')
      .exec();

    // Transform to return user objects with isFollowing flag
    const followingUsers = await Promise.all(
      following.map(async (follow) => {
        const user = follow.followingId as any;

        // If current user is authenticated, check if they follow this user
        let isFollowing = false;
        if (currentUserId) {
          const followCheck = await this.followerModel.findOne({
            followerId: currentUserId.toString(),
            followingId: user._id.toString(),
          });
          isFollowing = !!followCheck;
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isFollowing: currentUserId === userId ? true : isFollowing,
        };
      }),
    );

    return followingUsers;
  }
}
