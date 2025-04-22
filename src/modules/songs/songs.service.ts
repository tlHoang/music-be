import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Song } from './schemas/song.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { Genre } from '@/modules/genres/schemas/genre.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Follower } from '../followers/schemas/follower.schema';
import { FeedItem, UserInfo } from './interfaces/feed-item.interface';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Follower.name) private readonly followerModel: Model<Follower>,
  ) {}

  async create(createSongDto: CreateSongDto) {
    const song = await this.songModel.create(createSongDto);

    // Update the user's songs field
    await this.userModel.findByIdAndUpdate(song.userId, {
      $push: { songs: song._id },
    });

    return song;
  }

  findAll() {
    return this.songModel.find().exec();
  }

  findOne(id: string) {
    return this.songModel.findById(id).exec();
  }

  update(id: string, updateSongDto: UpdateSongDto) {
    return this.songModel
      .findByIdAndUpdate(id, updateSongDto, { new: true })
      .exec();
  }

  remove(id: string) {
    return this.songModel.findByIdAndDelete(id).exec();
  }

  async findSongsByUser(userId: string) {
    return this.songModel.find({ userId }).sort({ uploadDate: -1 });
  }

  async findPublicSongsByUser(userId: string, isOwner: boolean = false) {
    // If owner is viewing, return all songs. Otherwise, only return public songs
    const query = isOwner ? { userId } : { userId, visibility: 'PUBLIC' };

    return this.songModel.find(query).sort({ uploadDate: -1 });
  }

  async getFeed(userId: string): Promise<FeedItem[]> {
    // Find all user IDs that the current user follows
    const following = await this.followerModel
      .find({ followerId: userId.toString() })
      .select('followingId')
      .lean();

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      // If not following anyone, return empty array
      return [];
    }

    // Find recent public songs from users the current user follows
    const songs = await this.songModel
      .find({
        userId: { $in: followingIds },
        visibility: 'PUBLIC',
      })
      .sort({ uploadDate: -1 })
      .limit(50) // Limit to most recent 50 songs
      .populate({
        path: 'userId',
        select: '_id name username avatar email',
        model: 'User',
      })
      .lean(); // Use lean() for better performance

    // Transform the results to the expected format
    return songs.map((song) => {
      // Add proper type assertion for the populated user data
      const userInfo = song.userId as unknown as {
        _id: Types.ObjectId;
        name?: string;
        username?: string;
        email?: string;
        avatar?: string;
      };

      return {
        ...song,
        user: {
          _id: userInfo._id,
          name:
            userInfo.name ||
            userInfo.username ||
            userInfo.email ||
            'Unknown Artist', // Fallback to email or 'Unknown Artist'
          avatar: userInfo.avatar,
        },
      };
    });
  }
}
