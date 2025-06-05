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
import { FirebaseService } from '../firebase/firebase.service';
import { GenresService } from '../genres/genres.service';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Follower.name) private readonly followerModel: Model<Follower>,
    private readonly firebaseService: FirebaseService, // Inject FirebaseService
    private readonly genresService: GenresService, // Inject GenresService
  ) {}

  async create(createSongDto: CreateSongDto) {
    const song = await this.songModel.create(createSongDto);

    // Update the user's songs field
    await this.userModel.findByIdAndUpdate(song.userId, {
      $push: { songs: song._id },
    });

    return song;
  }

  async findAll() {
    const songs = await this.songModel
      .find()
      .populate('genres')
      .populate('userId', 'username name')
      .exec();
    return songs.map((song) => {
      let artist = song.artist;
      const userObj: any = song.userId;
      if (
        !artist &&
        userObj &&
        typeof userObj === 'object' &&
        (userObj.name || userObj.username)
      ) {
        artist = userObj.name || userObj.username || 'Unknown Artist';
      } else if (!artist) {
        artist = 'Unknown Artist';
      }
      return {
        ...song.toObject(),
        artist,
        user: userObj,
      };
    });
  }

  async findOne(id: string) {
    return this.songModel.findById(id).populate('genres').exec();
  }

  update(id: string, updateSongDto: UpdateSongDto) {
    return this.songModel
      .findByIdAndUpdate(id, updateSongDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    // First, find the song to get the userId
    const song = await this.songModel.findById(id);

    if (!song) {
      return null;
    }

    // Get the user ID from the song
    const userId = song.userId;

    // Delete the song from the database
    const result = await this.songModel.findByIdAndDelete(id).exec();

    if (result) {
      try {
        // Convert string ID to ObjectId for proper matching
        const songObjectId = new Types.ObjectId(id);

        // Remove the song ID from the user's songs array
        const updateResult = await this.userModel.findByIdAndUpdate(
          userId,
          { $pull: { songs: songObjectId } },
          { new: true },
        );

        console.log(
          `Attempted to remove song ${id} from user ${userId}'s songs array`,
        );
        console.log('User songs after update:', updateResult?.songs);
      } catch (error) {
        console.error('Error removing song from user songs array:', error);
      }
    }

    return result;
  }

  async findSongsByUser(userId: string) {
    const songs = await this.songModel
      .find({ userId })
      .populate('genres')
      .populate('userId', 'username name')
      .sort({ uploadDate: -1 });
    return songs.map((song) => {
      let artist = song.artist;
      const userObj: any = song.userId;
      if (
        !artist &&
        userObj &&
        typeof userObj === 'object' &&
        (userObj.name || userObj.username)
      ) {
        artist = userObj.name || userObj.username || 'Unknown Artist';
      } else if (!artist) {
        artist = 'Unknown Artist';
      }
      return {
        ...song.toObject(),
        artist,
        user: userObj,
      };
    });
  }

  async findPublicSongsByUser(userId: string, isOwner: boolean = false) {
    // If owner is viewing, return all songs. Otherwise, only return public songs
    const query = isOwner ? { userId } : { userId, visibility: 'PUBLIC' };
    const songs = await this.songModel
      .find(query)
      .populate('genres')
      .populate('userId', 'username name')
      .sort({ uploadDate: -1 });
    return songs.map((song) => {
      let artist = song.artist;
      const userObj: any = song.userId;
      if (
        !artist &&
        userObj &&
        typeof userObj === 'object' &&
        (userObj.name || userObj.username)
      ) {
        artist = userObj.name || userObj.username || 'Unknown Artist';
      } else if (!artist) {
        artist = 'Unknown Artist';
      }
      return {
        ...song.toObject(),
        artist,
        user: userObj,
      };
    });
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
      .limit(50)
      .populate({
        path: 'userId',
        select: '_id name username avatar email',
        model: 'User',
      })
      .lean();

    // Transform the results to the expected format, with signed cover image URLs
    return Promise.all(
      songs.map(async (song) => {
        const userInfo = song.userId as unknown as {
          _id: Types.ObjectId;
          name?: string;
          username?: string;
          email?: string;
          avatar?: string;
        };
        let coverImage = song.cover || song.thumbnail;
        if (coverImage && coverImage.includes('storage.googleapis.com')) {
          coverImage = await this.firebaseService.getSignedUrl(coverImage);
        }
        return {
          ...song,
          user: {
            _id: userInfo._id,
            name:
              userInfo.name ||
              userInfo.username ||
              userInfo.email ||
              'Unknown Artist',
            avatar: userInfo.avatar,
          },
          coverImage, // Always provide a valid, signed cover image URL
        };
      }),
    );
  }

  async findAllForAdmin() {
    try {
      const songs = await this.songModel
        .find()
        .sort({ uploadDate: -1 })
        .populate('userId', '_id name username email profilePicture')
        .lean();

      // Add additional statistics or information needed for admin
      const enhancedSongs = songs.map((song) => {
        return {
          ...song,
          // You can add additional computed properties here if needed
        };
      });

      return {
        success: true,
        data: enhancedSongs,
      };
    } catch (error) {
      console.error('Error fetching all songs for admin:', error);
      return {
        success: false,
        message: 'Failed to retrieve songs',
        error: error.message,
      };
    }
  }

  async flagSong(id: string, isFlagged: boolean) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Invalid song ID format');
      }

      const updatedSong = await this.songModel.findByIdAndUpdate(
        id,
        { isFlagged },
        { new: true },
      );

      if (!updatedSong) {
        throw new NotFoundException(`Song with ID ${id} not found`);
      }

      return {
        success: true,
        data: updatedSong,
      };
    } catch (error) {
      console.error(`Error updating flag status for song ${id}:`, error);
      return {
        success: false,
        message: 'Failed to update song flag status',
        error: error.message,
      };
    }
  }

  async incrementPlays(id: string) {
    try {
      const song = await this.songModel.findByIdAndUpdate(
        id,
        { $inc: { playCount: 1 } },
        { new: true },
      );

      return {
        success: true,
        data: song,
      };
    } catch (error) {
      console.error('Error incrementing play count:', error);
      return {
        success: false,
        message: 'Failed to increment play count',
        error: error.message,
      };
    }
  }
  async searchSongs(query: string) {
    try {
      if (!query || query.trim() === '') {
        return {
          success: true,
          data: [],
          message: 'Please provide a search query',
        };
      }

      // Create a case-insensitive regex for searching
      const searchRegex = new RegExp(query, 'i');

      // Search in title, artist, etc.
      const songs = await this.songModel
        .find({
          $or: [
            { title: searchRegex },
            { artist: searchRegex },
            { album: searchRegex },
          ],
          // Only return songs that are public/active
          visibility: 'PUBLIC',
        })
        .limit(20) // Limit results for performance
        .sort({ createdAt: -1 }) // Sort by newest first
        .populate('userId', '_id name username profilePicture')
        .lean();

      console.log(`Search for "${query}" found ${songs.length} songs`);

      // Map the results to ensure consistent field naming between frontend and backend
      const mappedSongs = songs.map((song) => ({
        ...song,
        coverImage: song.thumbnail, // Map thumbnail to coverImage for frontend compatibility
      }));

      return {
        success: true,
        data: mappedSongs,
      };
    } catch (error) {
      console.error('Error searching songs:', error);
      return {
        success: false,
        message: 'Failed to search songs',
        error: error.message,
      };
    }
  }

  /**
   * Advanced search for songs with filtering, sorting, and pagination
   */
  async advancedSearchSongs(
    options: {
      query?: string;
      sort?: string;
      order?: string;
      artist?: string;
      genre?: string;
      visibility?: string;
      page?: number;
      limit?: number;
      minDuration?: number;
      maxDuration?: number;
    } = {},
  ) {
    // Ignore all params and just return the latest public songs for frontend testing
    const filter: any = { visibility: 'PUBLIC' };
    const sort: [string, 1 | -1][] = [['createdAt', -1]];
    const limit = 20;
    try {
      const songs = await this.songModel
        .find(filter)
        .sort(sort)
        .limit(limit)
        .populate('userId', '_id name username profilePicture')
        .lean();

      // Map the results to ensure consistent field naming between frontend and backend
      const mappedSongs = songs.map((song) => ({
        ...song,
        coverImage: song.thumbnail, // Map thumbnail to coverImage for frontend compatibility
      }));

      // Total count for pagination
      const total = await this.songModel.countDocuments(filter);

      let a = {
        success: true,
        data: mappedSongs,
        total,
        page: 1,
        limit,
      };
      console.log(a);
      return a;
    } catch (error) {
      console.error('Error in advanced search:', error);
      return {
        success: false,
        message: 'Failed to perform advanced search',
        error: error.message,
      };
    }
  }
}
