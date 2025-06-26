import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Song } from './schemas/song.schema';
import { FlagReport } from './schemas/flag-report.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { CreateFlagReportDto } from './dto/create-flag-report.dto';
import { ReviewFlagReportDto } from './dto/review-flag-report.dto';
import { Genre } from '@/modules/genres/schemas/genre.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Follower } from '../followers/schemas/follower.schema';
import { GenreSong } from '../genre-song/schemas/genre-song.schema';
import { FeedItem, UserInfo } from './interfaces/feed-item.interface';
import { FirebaseService } from '../firebase/firebase.service';
import { GenresService } from '../genres/genres.service';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
    @InjectModel(FlagReport.name)
    private readonly flagReportModel: Model<FlagReport>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Follower.name) private readonly followerModel: Model<Follower>,
    @InjectModel(GenreSong.name)
    private readonly genreSongModel: Model<GenreSong>,
    private readonly firebaseService: FirebaseService, // Inject FirebaseService
    private readonly genresService: GenresService, // Inject GenresService
    private readonly vectorService: VectorService, // Inject VectorService
  ) {}

  // Count songs for a user (for subscription limit checks)
  async countUserSongs(userId: string): Promise<number> {
    // Try both string and ObjectId formats since data might be stored inconsistently
    const count = await this.songModel.countDocuments({
      $or: [
        { userId: userId }, // string format
        { userId: new Types.ObjectId(userId) }, // ObjectId format
      ],
      isFlagged: { $ne: true },
    });

    return count;
  }

  async create(createSongDto: CreateSongDto) {
    const song = await this.songModel.create(createSongDto);

    // Update the user's songs field
    await this.userModel.findByIdAndUpdate(song.userId, {
      $push: { songs: song._id },
    });

    // Generate embedding for lyrics if provided
    if (createSongDto.lyrics && this.vectorService.isAvailable()) {
      this.generateAndStoreLyricsEmbedding(song._id.toString()).catch(
        console.error,
      );
    }

    return song;
  }

  async findAll() {
    const songs = await this.songModel
      .find({ isFlagged: { $ne: true } }) // Exclude flagged tracks
      .populate('userId', 'username name')
      .exec();

    console.log('=== FIND ALL GENRE DEBUG ===');
    console.log('Total songs found:', songs.length);
    console.log('First song raw genres:', songs[0]?.genres);

    // Manually populate genres for all songs
    const songsWithGenres = await this.populateGenresForSongs(
      songs.map((s) => s.toObject()),
    );

    return songsWithGenres.map((song) => {
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
        ...song,
        artist,
        user: userObj,
      };
    });
  }

  async findOne(id: string) {
    const song = await this.songModel
      .findOne({ _id: id, isFlagged: { $ne: true } }) // Exclude flagged tracks
      .populate('userId', '_id name username profilePicture email')
      .exec();

    if (!song) {
      return null;
    }

    console.log('=== TRACK DETAIL GENRE DEBUG ===');
    console.log('Track ID:', id);
    console.log('Raw song genres field:', song.genres);

    // Manually populate genres for this single song
    const songObj = song.toObject();
    const [songWithGenres] = await this.populateGenresForSongs([songObj]);

    console.log('Track with populated genres:', songWithGenres.genres);

    return songWithGenres;
  }

  update(id: string, updateSongDto: UpdateSongDto) {
    return this.songModel
      .findByIdAndUpdate(id, updateSongDto, { new: true })
      .exec();
  }

  /**
   * Update song lyrics and regenerate embedding
   */
  async updateSongWithLyrics(songId: string, lyrics: string): Promise<any> {
    try {
      // Update the song with new lyrics
      const updatedSong = await this.songModel.findByIdAndUpdate(
        songId,
        {
          lyrics: lyrics.trim(),
          lyricsEmbedding: null, // Clear old embedding
        },
        { new: true },
      );

      if (!updatedSong) {
        throw new NotFoundException('Song not found');
      }

      // Generate new embedding for the updated lyrics
      if (lyrics && lyrics.trim() && this.vectorService.isAvailable()) {
        // Generate embedding asynchronously (don't wait for it)
        this.generateAndStoreLyricsEmbedding(songId).catch((error) => {
          console.error(`Failed to generate embedding for updated song ${songId}:`, error);
        });
      }

      return {
        success: true,
        message: 'Song lyrics updated successfully',
        song: {
          _id: updatedSong._id,
          title: updatedSong.title,
          lyrics: updatedSong.lyrics,
          hasEmbedding: !!updatedSong.lyricsEmbedding,
        },
      };
    } catch (error) {
      console.error('Error updating song lyrics:', error);
      throw error;
    }
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
      .populate('userId', 'username name')
      .sort({ uploadDate: -1 })
      .exec();

    // Manually populate genres
    const songsWithGenres = await this.populateGenresForSongs(
      songs.map((s) => s.toObject()),
    );

    return songsWithGenres.map((song) => {
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
        ...song,
        artist,
        user: userObj,
      };
    });
  }

  async findPublicSongsByUser(userId: string, isOwner: boolean = false) {
    // If owner is viewing, return all songs. Otherwise, only return public songs
    const query = isOwner
      ? { userId }
      : { userId, visibility: 'PUBLIC', isFlagged: { $ne: true } };
    const songs = await this.songModel
      .find(query)
      .populate('userId', 'username name')
      .sort({ uploadDate: -1 })
      .exec();

    // Manually populate genres
    const songsWithGenres = await this.populateGenresForSongs(
      songs.map((s) => s.toObject()),
    );

    return songsWithGenres.map((song) => {
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
        ...song,
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
        isFlagged: { $ne: true }, // Exclude flagged tracks
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
      console.log('Finding songs for admin...');
      const songs = await this.songModel
        .find()
        .sort({ uploadDate: -1 })
        .populate('userId', '_id name username email profilePicture')
        .populate('genres', '_id name')
        .lean();

      console.log('Sample song genres before processing:', songs[0]?.genres);

      // Generate signed URLs for audioUrl and cover for each song
      const enhancedSongs = await Promise.all(
        songs.map(async (song) => {
          let audioUrl = song.audioUrl;
          let cover = song.cover;

          // Generate signed URL for audio if it's a Firebase Storage URL
          if (audioUrl && audioUrl.includes('storage.googleapis.com')) {
            audioUrl = await this.firebaseService.getSignedUrl(audioUrl);
          }

          // Generate signed URL for cover if it's a Firebase Storage URL
          if (cover && cover.includes('storage.googleapis.com')) {
            cover = await this.firebaseService.getSignedUrl(cover);
          }

          // Extract genre names from populated genres array
          console.log('Processing song genres:', song.genres);
          const genreNames =
            (song.genres as any[])
              ?.map((genre: any) => {
                console.log('Genre object:', genre);
                return genre?.name;
              })
              .filter(Boolean) || [];
          const primaryGenre = genreNames.length > 0 ? genreNames[0] : null;

          console.log(
            'Extracted genre names:',
            genreNames,
            'Primary genre:',
            primaryGenre,
          );

          return {
            ...song,
            audioUrl,
            cover,
            genre: primaryGenre, // Single genre for backward compatibility
            genreNames, // All genre names for advanced use
            // You can add additional computed properties here if needed
          };
        }),
      );

      console.log(
        'Sample enhanced song:',
        JSON.stringify(enhancedSongs[0], null, 2),
      );

      // Return the tracks directly, without nesting them
      // This will become response.data after the interceptor processes it
      return enhancedSongs;
    } catch (error) {
      console.error('Error fetching all songs for admin:', error);
      throw error; // Let the exception filters handle errors
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

  // User flag reporting methods
  async reportSong(
    songId: string,
    userId: string,
    createFlagReportDto: CreateFlagReportDto,
  ) {
    try {
      // Check if song exists
      const song = await this.songModel.findById(songId);
      if (!song) {
        throw new NotFoundException('Song not found');
      }

      // Check if user already reported this song
      const existingReport = await this.flagReportModel.findOne({
        songId: new Types.ObjectId(songId),
        reportedBy: new Types.ObjectId(userId),
      });

      if (existingReport) {
        throw new ConflictException('You have already reported this song');
      }

      // Create new flag report
      const flagReport = await this.flagReportModel.create({
        songId: new Types.ObjectId(songId),
        reportedBy: new Types.ObjectId(userId),
        reason: createFlagReportDto.reason,
        description: createFlagReportDto.description,
      });

      return {
        success: true,
        message: 'Song reported successfully',
        data: flagReport,
      };
    } catch (error) {
      console.error(`Error reporting song ${songId}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to report song');
    }
  }

  async getFlagReports(page: number = 1, limit: number = 10, status?: string) {
    try {
      const skip = (page - 1) * limit;
      const filter = status ? { status } : {};

      const [reports, total] = await Promise.all([
        this.flagReportModel
          .find(filter)
          .populate('songId', 'title artist audioUrl thumbnail')
          .populate('reportedBy', 'username name email')
          .populate('reviewedBy', 'username name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.flagReportModel.countDocuments(filter),
      ]);

      return {
        success: true,
        data: {
          reports,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error fetching flag reports:', error);
      throw new BadRequestException('Failed to fetch flag reports');
    }
  }

  async reviewFlagReport(
    reportId: string,
    adminId: string,
    reviewDto: ReviewFlagReportDto,
  ) {
    try {
      // Find the flag report
      const report = await this.flagReportModel.findById(reportId);
      if (!report) {
        throw new NotFoundException('Flag report not found');
      }

      // Update the report
      const updatedReport = await this.flagReportModel
        .findByIdAndUpdate(
          reportId,
          {
            status: reviewDto.status,
            reviewedBy: new Types.ObjectId(adminId),
            reviewedAt: new Date(),
            reviewNotes: reviewDto.reviewNotes,
          },
          { new: true },
        )
        .populate('songId', 'title artist');

      // If admin decides to flag the song, update the song
      if (reviewDto.flagSong) {
        await this.songModel.findByIdAndUpdate(report.songId, {
          isFlagged: true,
        });
      }

      return {
        success: true,
        message: 'Flag report reviewed successfully',
        data: updatedReport,
      };
    } catch (error) {
      console.error(`Error reviewing flag report ${reportId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to review flag report');
    }
  }

  async getFlaggedSongs(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [songs, total] = await Promise.all([
        this.songModel
          .find({ isFlagged: true })
          .populate('userId', 'username name email')
          .populate('genres')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.songModel.countDocuments({ isFlagged: true }),
      ]);

      return {
        success: true,
        data: {
          songs,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error fetching flagged songs:', error);
      throw new BadRequestException('Failed to fetch flagged songs');
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
          // Only return songs that are public/active and not flagged
          visibility: 'PUBLIC',
          isFlagged: { $ne: true },
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
      search?: string;
      sort?: string;
      sortBy?: string;
      order?: string;
      sortOrder?: string;
      artist?: string;
      genre?: string;
      visibility?: string;
      page?: number;
      limit?: number;
      minDuration?: number;
      maxDuration?: number;
    } = {},
  ) {
    try {
      console.log('Received genre option:', options.genre);

      // Build filter object using $and for all conditions
      const andFilters: any[] = [];

      // Set visibility filter
      if (options.visibility) {
        andFilters.push({ visibility: options.visibility });
      } else {
        andFilters.push({ visibility: 'PUBLIC' });
      }

      // Exclude flagged tracks from public searches
      andFilters.push({ isFlagged: { $ne: true } });

      // Text search in title, artist, or album
      const searchTerm = options.search || options.query;
      if (searchTerm && searchTerm.trim()) {
        const searchRegex = new RegExp(searchTerm.trim(), 'i');
        andFilters.push({
          $or: [
            { title: searchRegex },
            { artist: searchRegex },
            { album: searchRegex },
          ],
        });
      }

      // Artist filter
      if (options.artist && options.artist.trim()) {
        const artistRegex = new RegExp(options.artist.trim(), 'i');
        andFilters.push({ artist: artistRegex });
      }

      // Duration filters
      if (options.minDuration && options.minDuration > 0) {
        andFilters.push({ duration: { $gte: options.minDuration } });
      }
      if (options.maxDuration && options.maxDuration > 0) {
        andFilters.push({ duration: { $lte: options.maxDuration } });
      }

      // Genre filter (for genres as array of strings)
      if (
        options.genre &&
        options.genre !== 'all' &&
        /^[a-fA-F0-9]{24}$/.test(options.genre)
      ) {
        andFilters.push({ genres: options.genre });
      }

      // Combine all filters
      const filter =
        andFilters.length > 1 ? { $and: andFilters } : andFilters[0] || {};
      console.log(
        'Final MongoDB filter for advanced search:',
        JSON.stringify(filter),
      );

      // Pagination
      const page = Math.max(1, parseInt(String(options.page)) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(String(options.limit)) || 20),
      );
      const skip = (page - 1) * limit;

      // Sorting
      let sortBy = options.sortBy || options.sort || 'uploadDate';
      let sortOrder = options.sortOrder || options.order || 'desc';

      // Map frontend sort fields to backend fields
      const sortFieldMap: { [key: string]: string } = {
        uploadDate: 'createdAt',
        title: 'title',
        playCount: 'playCount',
        likes: 'likeCount',
        duration: 'duration',
      };

      const actualSortField = sortFieldMap[sortBy] || 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;

      let query = this.songModel
        .find(filter)
        .populate('userId', '_id name username profilePicture')
        .populate({
          path: 'genres',
          select: '_id name',
          model: 'Genre',
        })
        .sort({ [actualSortField]: sortDirection })
        .skip(skip)
        .limit(limit);

      const songs = await query.exec();
      const total = await this.songModel.countDocuments(filter);

      // Map the results to ensure consistent field naming
      let songsRaw = songs.map((song) => song.toObject());
      console.log(
        'Raw genres before population:',
        songsRaw.map((s) => ({ id: s._id, genres: s.genres })),
      );
      let mappedSongs = songsRaw.map((song) => ({
        ...song,
        cover: song.thumbnail || song.cover, // Use thumbnail as cover
      }));

      // If filtering by genre, only keep the matching genre(s) in each song
      if (
        options.genre &&
        options.genre !== 'all' &&
        /^[a-fA-F0-9]{24}$/.test(options.genre)
      ) {
        const genreId = options.genre;
        mappedSongs = mappedSongs.map((song) => {
          const filteredGenres = (song.genres || []).filter(
            (g) => (g._id?.toString?.() || g.toString?.()) === genreId,
          );
          console.log('Song', song._id, 'filtered genres:', filteredGenres);
          return {
            ...song,
            genres: filteredGenres,
          };
        });
      }

      return {
        success: true,
        data: mappedSongs,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error in advanced search:', error);
      return {
        success: false,
        message: 'Failed to perform advanced search',
        error: error.message,
      };
    }
  }

  /**
   * Fallback text search for lyrics
   */
  async searchSongsByLyricsText(
    query: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const songs = await this.songModel
        .find({
          lyrics: { $regex: query, $options: 'i' },
          isFlagged: { $ne: true },
        })
        .populate('userId', 'name username email avatar')
        .limit(limit)
        .lean()
        .exec();

      const songsWithGenres = await this.populateGenresForSongs(songs);

      return songsWithGenres.map((song) => ({
        ...song,
        cover: song.thumbnail || song.cover, // Map thumbnail to cover
        artist:
          song.artist ||
          (song.userId as any)?.name ||
          (song.userId as any)?.username ||
          'Unknown Artist',
        user: song.userId,
        searchType: 'text',
      }));
    } catch (error) {
      console.error('Error in text search:', error);
      return [];
    }
  }

  /**
   * Batch generate embeddings for existing songs
   */
  async generateEmbeddingsForAllSongs(): Promise<void> {
    try {
      if (!this.vectorService.isAvailable()) {
        console.log('Vector service not available');
        return;
      }

      const songs = await this.songModel
        .find({
          lyrics: { $exists: true, $nin: [null, ''] },
          lyricsEmbedding: { $exists: false },
          isFlagged: { $ne: true },
        })
        .select('_id lyrics')
        .limit(100); // Process in batches

      console.log(`Processing ${songs.length} songs for embedding generation`);

      for (const song of songs) {
        await this.generateAndStoreLyricsEmbedding(song._id.toString());
        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log('Completed batch embedding generation');
    } catch (error) {
      console.error('Error in batch embedding generation:', error);
    }
  }

  /**
   * Get similar songs based on lyrics
   */
  async getSimilarSongs(songId: string, limit: number = 5): Promise<any[]> {
    try {
      const song = await this.songModel.findById(songId);
      if (!song || !song.lyricsEmbedding) {
        return [];
      }

      const similarSongs = await this.songModel
        .find({
          _id: { $ne: songId },
          lyricsEmbedding: { $exists: true, $ne: null },
          isFlagged: { $ne: true },
        })
        .populate('userId', 'name username email avatar')
        .lean()
        .exec();

      const songsWithSimilarity = similarSongs
        .map((otherSong) => {
          if (!otherSong.lyricsEmbedding) return null;

          try {
            const similarity = this.vectorService.calculateCosineSimilarity(
              song.lyricsEmbedding,
              otherSong.lyricsEmbedding,
            );

            return {
              ...otherSong,
              similarity,
            };
          } catch (error) {
            return null;
          }
        })
        .filter((song) => song !== null && song.similarity > 0.6)
        .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
        .slice(0, limit);

      const songsWithGenres =
        await this.populateGenresForSongs(songsWithSimilarity);

      return songsWithGenres.map((song) => ({
        ...song,
        cover: song.thumbnail || song.cover, // Map thumbnail to cover
        artist:
          song.artist ||
          (song.userId as any)?.name ||
          (song.userId as any)?.username ||
          'Unknown Artist',
        user: song.userId,
        similarity: song.similarity,
      }));
    } catch (error) {
      console.error('Error getting similar songs:', error);
      return [];
    }
  }

  /**
   * Search songs by lyrics content using MongoDB Atlas Vector Search
   */
  async searchSongsByLyrics(
    query: string,
    limit: number = 10,
    similarityThreshold: number = 0.7,
  ): Promise<any[]> {
    try {
      if (!this.vectorService.isAvailable()) {
        console.log(
          'Vector service not available, falling back to text search',
        );
        return this.searchSongsByLyricsText(query, limit);
      }

      // Generate embedding for search query
      const queryEmbedding = await this.vectorService.generateEmbedding(query);
      if (!queryEmbedding) {
        console.log(
          'Could not generate query embedding, falling back to text search',
        );
        return this.searchSongsByLyricsText(query, limit);
      }

      try {
        // First, try MongoDB Atlas Vector Search
        const vectorSearchPipeline = [
          {
            $vectorSearch: {
              index: 'lyrics_vector_index', // This index needs to be created in Atlas
              path: 'lyricsEmbedding',
              queryVector: queryEmbedding,
              numCandidates: Math.max(limit * 10, 100), // Search more candidates for better results
              limit: limit,
              filter: {
                isFlagged: { $ne: true },
                lyrics: { $exists: true, $ne: null, $nin: ['', null] },
              },
            },
          },
          {
            $addFields: {
              similarity: { $meta: 'vectorSearchScore' },
            },
          },
          {
            $match: {
              similarity: { $gte: similarityThreshold },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'userId',
              pipeline: [
                { $project: { name: 1, username: 1, email: 1, avatar: 1 } },
              ],
            },
          },
          {
            $unwind: '$userId',
          },
          {
            $project: {
              _id: 1,
              title: 1,
              audioUrl: 1,
              cover: 1,
              thumbnail: 1,
              lyrics: 1,
              userId: 1,
              uploadDate: 1,
              duration: 1,
              playCount: 1,
              likeCount: 1,
              visibility: 1,
              similarity: 1
            },
          },
        ];

        console.log('Attempting MongoDB Atlas Vector Search...');
        const vectorResults = await this.songModel.aggregate(vectorSearchPipeline).exec();

        if (vectorResults && vectorResults.length > 0) {
          console.log(`Atlas Vector Search found ${vectorResults.length} results`);

          // Populate genres for the results
          const songsWithGenres = await this.populateGenresForSongs(vectorResults);

          return songsWithGenres.map((song) => ({
            ...song,
            cover: song.thumbnail || song.cover, // Map thumbnail to cover
            artist: song.userId?.name || song.userId?.username || 'Unknown Artist',
            user: song.userId,
            searchType: 'atlas_vector',
            similarity: song.similarity,
          }));
        }
      } catch (vectorError) {
        console.log('Atlas Vector Search not available or index not found, falling back to manual calculation:', vectorError.message);

        // Fallback to manual vector similarity calculation
        return this.searchSongsByLyricsManual(query, limit, similarityThreshold, queryEmbedding);
      }

      // If no results from vector search, fallback to text search
      console.log('No vector search results, falling back to text search');
      return this.searchSongsByLyricsText(query, limit);
    } catch (error) {
      console.error('Error in vector search:', error);
      return this.searchSongsByLyricsText(query, limit);
    }
  }

  /**
   * Manual vector similarity calculation (fallback)
   */
  private async searchSongsByLyricsManual(
    query: string,
    limit: number = 10,
    similarityThreshold: number = 0.7,
    queryEmbedding?: number[],
  ): Promise<any[]> {
    try {
      // Generate embedding if not provided
      if (!queryEmbedding) {
        const embedding = await this.vectorService.generateEmbedding(query);
        if (!embedding) {
          return this.searchSongsByLyricsText(query, limit);
        }
        queryEmbedding = embedding;
      }

      // Use MongoDB aggregation for better performance
      const pipeline = [
        {
          $match: {
            lyricsEmbedding: { $exists: true, $ne: null },
            isFlagged: { $ne: true },
            lyrics: { $exists: true, $ne: null, $nin: ['', null] },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userId',
            pipeline: [
              { $project: { name: 1, username: 1, email: 1, avatar: 1 } },
            ],
          },
        },
        {
          $unwind: '$userId',
        },
        {
          $project: {
            _id: 1,
            title: 1,
            audioUrl: 1,
            cover: 1,
            thumbnail: 1,
            lyrics: 1,
            lyricsEmbedding: 1,
            userId: 1,
            uploadDate: 1,
            duration: 1,
            playCount: 1,
            likeCount: 1,
            visibility: 1,
          },
        },
        {
          $limit: 1000, // Limit to prevent memory issues
        },
      ];

      const songsWithEmbeddings = await this.songModel.aggregate(pipeline).exec();

      if (songsWithEmbeddings.length === 0) {
        return this.searchSongsByLyricsText(query, limit);
      }

      // Calculate similarities and filter
      const results: any[] = [];

      for (const song of songsWithEmbeddings) {
        if (!song.lyricsEmbedding || song.lyricsEmbedding.length === 0) {
          continue;
        }

        try {
          const similarity = this.vectorService.calculateCosineSimilarity(
            queryEmbedding,
            song.lyricsEmbedding,
          );

          if (similarity >= similarityThreshold) {
            results.push({
              ...song,
              cover: song.thumbnail || song.cover, // Map thumbnail to cover
              similarity,
              artist: song.userId?.name || song.userId?.username || 'Unknown Artist',
              user: song.userId,
              searchType: 'manual_vector',
            });
          }
        } catch (error) {
          console.error('Error calculating similarity for song:', song._id, error);
        }
      }

      // Sort by similarity and limit results
      const sortedResults = results
        .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
        .slice(0, limit);

      // Populate genres for the final results
      const songsWithGenres = await this.populateGenresForSongs(sortedResults);

      return songsWithGenres;
    } catch (error) {
      console.error('Error in manual vector search:', error);
      return this.searchSongsByLyricsText(query, limit);
    }
  }

  /**
   * Generate and store lyrics embedding for a song
   */
  async generateAndStoreLyricsEmbedding(songId: string): Promise<void> {
    try {
      const song = await this.songModel.findById(songId);
      if (!song || !song.lyrics) {
        console.log(`Song ${songId} not found or has no lyrics`);
        return;
      }

      if (!this.vectorService.isAvailable()) {
        console.log('Vector service not available');
        return;
      }

      // Generate embedding
      const embedding = await this.vectorService.generateEmbedding(song.lyrics);
      if (!embedding) {
        console.log(`Failed to generate embedding for song ${songId}`);
        return;
      }

      // Store embedding
      await this.songModel.findByIdAndUpdate(songId, {
        lyricsEmbedding: embedding,
      });

      console.log(`Generated and stored embedding for song ${songId}`);
    } catch (error) {
      console.error(`Error generating embedding for song ${songId}:`, error);
    }
  }

  /**
   * Populate genres for songs
   */
  async populateGenresForSongs(songs: any[]): Promise<any[]> {
    try {
      if (!songs || songs.length === 0) {
        return [];
      }

      // Get all song IDs
      const songIds = songs.map((song) => song._id);

      // Find genre relationships
      const genreSongs = await this.genreSongModel
        .find({ songId: { $in: songIds } })
        .populate('genreId', 'name')
        .lean()
        .exec();

      // Create a map of song ID to genres
      const songGenreMap = new Map();
      genreSongs.forEach((gs) => {
        if (!songGenreMap.has(gs.songId.toString())) {
          songGenreMap.set(gs.songId.toString(), []);
        }
        if (gs.genreId && typeof gs.genreId === 'object' && 'name' in gs.genreId) {
          songGenreMap.get(gs.songId.toString()).push({
            _id: gs.genreId._id,
            name: (gs.genreId as any).name,
          });
        }
      });

      // Add genres to songs
      return songs.map((song) => ({
        ...song,
        genres: songGenreMap.get(song._id.toString()) || [],
      }));
    } catch (error) {
      console.error('Error populating genres:', error);
      return songs; // Return songs without genres if error occurs
    }
  }
}
