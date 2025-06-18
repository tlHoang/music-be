import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowPlaylist } from './schemas/follow-playlist.schema';
import { CreateFollowPlaylistDto } from './dto/create-follow-playlist.dto';

@Injectable()
export class FollowPlaylistService {
  constructor(
    @InjectModel(FollowPlaylist.name)
    private readonly followPlaylistModel: Model<FollowPlaylist>,
  ) {}

  async followPlaylist(createFollowPlaylistDto: CreateFollowPlaylistDto) {
    try {
      const existingFollow = await this.followPlaylistModel.findOne({
        userId: new Types.ObjectId(createFollowPlaylistDto.userId),
        playlistId: new Types.ObjectId(createFollowPlaylistDto.playlistId),
      });

      if (existingFollow) {
        throw new ConflictException('You are already following this playlist');
      }

      const followPlaylist = await this.followPlaylistModel.create({
        userId: new Types.ObjectId(createFollowPlaylistDto.userId),
        playlistId: new Types.ObjectId(createFollowPlaylistDto.playlistId),
      });

      return {
        success: true,
        message: 'Successfully followed playlist',
        data: followPlaylist,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to follow playlist: ${error.message}`);
    }
  }

  async unfollowPlaylist(userId: string, playlistId: string) {
    try {
      const followRecord = await this.followPlaylistModel.findOneAndDelete({
        userId: new Types.ObjectId(userId),
        playlistId: new Types.ObjectId(playlistId),
      });

      if (!followRecord) {
        throw new NotFoundException('Follow relationship not found');
      }

      return {
        success: true,
        message: 'Successfully unfollowed playlist',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to unfollow playlist: ${error.message}`);
    }
  }

  async checkFollowStatus(userId: string, playlistId: string) {
    try {
      const followRecord = await this.followPlaylistModel.findOne({
        userId: new Types.ObjectId(userId),
        playlistId: new Types.ObjectId(playlistId),
      });

      return {
        success: true,
        data: {
          isFollowing: !!followRecord,
          followId: followRecord?._id || null,
        },
      };
    } catch (error) {
      throw new Error(`Failed to check follow status: ${error.message}`);
    }
  }

  async getPlaylistFollowers(playlistId: string) {
    try {
      const followers = await this.followPlaylistModel
        .find({ playlistId: new Types.ObjectId(playlistId) })
        .populate('userId', '_id name username profilePicture')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: {
          followers,
          count: followers.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get playlist followers: ${error.message}`);
    }
  }

  async getFollowedPlaylists(userId: string) {
    try {
      const followedPlaylists = await this.followPlaylistModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate({
          path: 'playlistId',
          populate: [
            { path: 'userId', select: '_id name username profilePicture' },
            { path: 'songs', select: '_id title artist duration' },
          ],
        })
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: followedPlaylists.map((follow) => follow.playlistId),
      };
    } catch (error) {
      throw new Error(`Failed to get followed playlists: ${error.message}`);
    }
  }

  async getFollowersCount(playlistId: string): Promise<number> {
    try {
      return await this.followPlaylistModel.countDocuments({
        playlistId: new Types.ObjectId(playlistId),
      });
    } catch (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }
  }

  remove(id: string) {
    return this.followPlaylistModel.findByIdAndDelete(id).exec();
  }
}
