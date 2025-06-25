import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Playlist } from './schemas/playlist.schema';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { ReorderSongsDto } from './dto/reorder-songs.dto';
import { Song } from '../songs/schemas/song.schema';
import { User } from '../users/schemas/user.schema';
import { FollowPlaylist } from '../follow-playlist/schemas/follow-playlist.schema';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class PlaylistsService {
  private logger = new Logger(PlaylistsService.name);
  constructor(
    @InjectModel(Playlist.name) private readonly playlistModel: Model<Playlist>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
    @InjectModel(FollowPlaylist.name)
    private readonly followPlaylistModel: Model<FollowPlaylist>,
    private readonly firebaseService: FirebaseService,
  ) {
    // Verify DB connection on service init
    this.checkDatabaseConnection();
  }

  private async checkDatabaseConnection() {
    try {
      this.logger.log('Checking database connection...');
      const count = await this.playlistModel.countDocuments().exec();
      this.logger.log(
        `Database connection successful. Total playlists: ${count}`,
      );
    } catch (error) {
      this.logger.error('Database connection error:', error);
    }
  }

  // Count playlists for a user (for subscription limit checks)
  async countUserPlaylists(userId: string): Promise<number> {
    // Try both string and ObjectId formats since data might be stored inconsistently
    const count = await this.playlistModel.countDocuments({
      $or: [
        { userId: userId }, // string format
        { userId: new Types.ObjectId(userId) }, // ObjectId format
      ],
    });

    return count;
  }

  create(createPlaylistDto: CreatePlaylistDto) {
    return this.playlistModel.create(createPlaylistDto);
  }
  async findAll(visibility?: string, limit?: number) {
    // Build query filter
    const query: any = {};
    if (visibility) {
      query.visibility = visibility.toUpperCase();
    }

    // Build the query with optional population and limiting
    let queryBuilder = this.playlistModel
      .find(query)
      .populate('userId', '_id name username profilePicture')
      .sort({ createdAt: -1 });

    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const playlists = await queryBuilder.exec();

    // Process signed URLs for covers
    const playlistsWithSignedCovers = await Promise.all(
      playlists.map(async (playlist) => {
        let cover = playlist.cover;
        if (cover && cover.includes('storage.googleapis.com')) {
          try {
            cover = await this.firebaseService.getSignedUrl(cover);
          } catch (error) {
            console.error(
              'Error getting signed URL for playlist cover:',
              error,
            );
            // Keep original URL if signing fails
          }
        }
        return { ...playlist.toObject(), cover };
      }),
    );

    return {
      success: true,
      statusCode: 200,
      data: playlistsWithSignedCovers,
    };
  }

  findOne(id: string) {
    return this.playlistModel.findById(id).exec();
  }

  update(id: string, updatePlaylistDto: UpdatePlaylistDto) {
    return this.playlistModel
      .findByIdAndUpdate(id, updatePlaylistDto, { new: true })
      .exec();
  }

  remove(id: string) {
    return this.playlistModel.findByIdAndDelete(id).exec();
  }
  async findAllForAdmin() {
    try {
      const playlists = await this.playlistModel
        .find()
        .sort({ createdAt: -1 })
        .populate('userId', '_id name username email profilePicture')
        .lean();

      // Enhance playlists with song count and followers count information
      const enhancedPlaylists = await Promise.all(
        playlists.map(async (playlist) => {
          // Get followers count for this playlist
          const followersCount = await this.followPlaylistModel.countDocuments({
            playlistId: playlist._id,
          });

          return {
            ...playlist,
            songCount: playlist.songs ? playlist.songs.length : 0,
            followersCount,
          };
        }),
      );

      return {
        success: true,
        data: enhancedPlaylists,
      };
    } catch (error) {
      console.error('Error fetching all playlists for admin:', error);
      return {
        success: false,
        message: 'Failed to retrieve playlists',
        error: error.message,
      };
    }
  }

  async setFeatured(id: string, isFeatured: boolean) {
    try {
      if (!isValidObjectId(id)) {
        throw new NotFoundException('Invalid playlist ID format');
      }

      const playlist = await this.playlistModel.findById(id);
      if (!playlist) {
        throw new NotFoundException('Playlist not found');
      }

      playlist.isFeatured = isFeatured;
      await playlist.save();

      return {
        success: true,
        data: playlist,
        message: `Playlist ${isFeatured ? 'marked as featured' : 'removed from featured'}`,
      };
    } catch (error) {
      console.error('Error updating playlist featured status:', error);
      return {
        success: false,
        message: 'Failed to update playlist featured status',
        error: error.message,
      };
    }
  }
  async findUserPlaylists(userId: string) {
    try {
      this.logger.debug('findUserPlaylists called with userId:', userId);

      if (!isValidObjectId(userId)) {
        this.logger.error('Invalid userId format:', userId);
        throw new NotFoundException('Invalid user ID format');
      }

      this.logger.debug('Looking for playlists with userId:', userId);
      // Convert string to ObjectId safely
      const userIdObj = new Types.ObjectId(userId);

      // Try to find playlists using the ObjectId with explicit population
      let playlists = await this.playlistModel
        .find({ userId: userIdObj })
        .sort({ createdAt: -1 })
        .populate({
          path: 'songs',
          model: 'Song',
          select: '_id title artist duration coverImage album audioUrl',
        })
        .lean();

      // Log the results of our first attempt
      this.logger.debug(
        `Found ${playlists.length} playlists for user ObjectId ${userId}`,
      );

      // If no playlists found, try searching with the string version as fallback
      if (playlists.length === 0) {
        this.logger.debug(
          'No playlists found with ObjectId, trying with string userId as fallback',
        );
        playlists = await this.playlistModel
          .find({ userId: userId.toString() })
          .sort({ createdAt: -1 })
          .populate({
            path: 'songs',
            model: 'Song',
            select: '_id title artist duration coverImage album audioUrl',
          })
          .lean();

        this.logger.debug(
          `Fallback search found ${playlists.length} playlists for string userId ${userId}`,
        );
      } // Log a sample playlist for debugging
      if (playlists.length > 0) {
        this.logger.debug(
          'Sample playlist songs:',
          playlists[0].songs
            ? `Found ${playlists[0].songs.length} songs in first playlist`
            : 'No songs in first playlist',
        );

        // Log a sample song if available
        if (playlists[0].songs && playlists[0].songs.length > 0) {
          this.logger.debug(
            'Sample song:',
            JSON.stringify(playlists[0].songs[0]),
          );
        }
      }

      // Process signed URLs for covers
      const playlistsWithSignedCovers = await Promise.all(
        playlists.map(async (playlist) => {
          let cover = playlist.cover;
          if (cover && cover.includes('storage.googleapis.com')) {
            try {
              cover = await this.firebaseService.getSignedUrl(cover);
            } catch (error) {
              console.error(
                'Error getting signed URL for playlist cover:',
                error,
              );
              // Keep original URL if signing fails
            }
          }
          return { ...playlist, cover };
        }),
      );

      return {
        success: true,
        data: playlistsWithSignedCovers,
      };
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      return {
        success: false,
        message: 'Failed to retrieve user playlists',
        error: error.message,
      };
    }
  }
  async addSongToPlaylist(playlistId: string, songId: string, userId: string) {
    try {
      if (!isValidObjectId(playlistId) || !isValidObjectId(songId)) {
        return {
          success: false,
          message: 'Invalid ID format',
          statusCode: 400, // Bad Request
        };
      }

      const playlist = await this.playlistModel.findById(playlistId);
      if (!playlist) {
        return {
          success: false,
          message: 'Playlist not found',
          statusCode: 404, // Not Found
        };
      }

      // Check if user owns this playlist
      if (playlist.userId.toString() !== userId) {
        return {
          success: false,
          message: 'You do not have permission to modify this playlist',
          statusCode: 403, // Forbidden
        };
      }

      // Check if song already exists in the playlist
      if (
        playlist.songs &&
        playlist.songs.some((id) => id.toString() === songId)
      ) {
        return {
          success: false,
          message: 'Song already exists in this playlist',
          statusCode: 409, // Using 409 Conflict for this case
        };
      }

      // Check if the song exists in the database
      const song = await this.songModel.findById(songId);
      if (!song) {
        return {
          success: false,
          message: 'Song not found',
          statusCode: 404, // Not Found
        };
      }

      // Add song to playlist
      playlist.songs = [...(playlist.songs || []), new Types.ObjectId(songId)];
      await playlist.save();

      // Get the song details to return in the response
      const addedSong = await this.songModel
        .findById(songId)
        .select('_id title artist album duration coverImage audioUrl')
        .lean();

      this.logger.debug('Added song to playlist:', {
        playlistId,
        songId,
        songTitle: addedSong?.title || 'Unknown',
      });

      return {
        success: true,
        data: {
          playlist: {
            _id: playlist._id,
            name: playlist.name,
            songCount: playlist.songs.length,
          },
          addedSong,
        },
        message: 'Song added to playlist successfully',
      };
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      return {
        success: false,
        message: 'Failed to add song to playlist',
        error: error.message,
        statusCode: 500, // Internal Server Error
      };
    }
  }
  async removeSongFromPlaylist(
    playlistId: string,
    songId: string,
    userId: string,
  ) {
    try {
      if (!isValidObjectId(playlistId) || !isValidObjectId(songId)) {
        return {
          success: false,
          message: 'Invalid ID format',
          statusCode: 400, // Bad Request
        };
      }

      const playlist = await this.playlistModel.findById(playlistId);
      if (!playlist) {
        return {
          success: false,
          message: 'Playlist not found',
          statusCode: 404, // Not Found
        };
      }

      // Check if user owns this playlist
      if (playlist.userId.toString() !== userId) {
        return {
          success: false,
          message: 'You do not have permission to modify this playlist',
          statusCode: 403, // Forbidden
        };
      }

      // Check if song exists in the playlist
      if (!playlist.songs.some((id) => id.toString() === songId)) {
        return {
          success: false,
          message: 'Song not found in this playlist',
          statusCode: 404, // Not Found
        };
      }

      // Remove song from playlist
      playlist.songs = playlist.songs.filter((id) => id.toString() !== songId);
      await playlist.save();

      return {
        success: true,
        data: playlist,
        message: 'Song removed from playlist successfully',
      };
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      return {
        success: false,
        message: 'Failed to remove song from playlist',
        error: error.message,
        statusCode: 500, // Internal Server Error
      };
    }
  }
  async getFeaturedPlaylists() {
    try {
      const playlists = await this.playlistModel
        .find({ isFeatured: true, visibility: 'PUBLIC' })
        .sort({ createdAt: -1 })
        .populate('userId', '_id name username profilePicture')
        .populate({
          path: 'songs',
          model: 'Song',
          select: '_id title artist album duration coverImage audioUrl',
        })
        .lean();

      this.logger.debug(`Found ${playlists.length} featured playlists`);

      // Process signed URLs for covers
      const playlistsWithSignedCovers = await Promise.all(
        playlists.map(async (playlist) => {
          let cover = playlist.cover;
          if (cover && cover.includes('storage.googleapis.com')) {
            try {
              cover = await this.firebaseService.getSignedUrl(cover);
            } catch (error) {
              console.error(
                'Error getting signed URL for playlist cover:',
                error,
              );
              // Keep original URL if signing fails
            }
          }
          return { ...playlist, cover };
        }),
      );

      // Log sample data for debugging
      if (playlistsWithSignedCovers.length > 0) {
        this.logger.debug('Sample featured playlist:', {
          id: playlistsWithSignedCovers[0]._id,
          name: playlistsWithSignedCovers[0].name,
          songCount: playlistsWithSignedCovers[0].songs?.length || 0,
          cover: playlistsWithSignedCovers[0].cover ? 'Has cover' : 'No cover',
        });
      }

      return {
        success: true,
        data: playlistsWithSignedCovers,
      };
    } catch (error) {
      console.error('Error fetching featured playlists:', error);
      return {
        success: false,
        message: 'Failed to retrieve featured playlists',
        error: error.message,
      };
    }
  }
  async getPlaylistDetails(playlistId: string) {
    try {
      if (!isValidObjectId(playlistId)) {
        throw new NotFoundException('Invalid playlist ID format');
      }

      // First fetch the playlist without populating
      const rawPlaylist = await this.playlistModel.findById(playlistId).lean();

      if (!rawPlaylist) {
        throw new NotFoundException('Playlist not found');
      }

      // Filter out any invalid song IDs before populating
      if (rawPlaylist.songs) {
        const validSongIds = rawPlaylist.songs.filter(
          (id) => id && isValidObjectId(id.toString()),
        );

        // Log if we found any invalid IDs
        if (validSongIds.length !== rawPlaylist.songs.length) {
          this.logger.warn(
            `Found ${rawPlaylist.songs.length - validSongIds.length} invalid song IDs in playlist ${playlistId}`,
          );
        }

        // Only keep valid song IDs for population
        rawPlaylist.songs = validSongIds;
      }

      // Now populate with only valid song IDs
      const populatedPlaylist = await this.playlistModel
        .findById(playlistId)
        .populate('userId', '_id name username profilePicture')
        .populate({
          path: 'songs',
          model: 'Song',
          select: '_id title artist album duration coverImage audioUrl',
          match: { _id: { $in: rawPlaylist.songs || [] } },
        })
        .lean();

      if (!populatedPlaylist) {
        throw new NotFoundException('Playlist not found after population');
      }

      // Log the songs array to debug
      this.logger.debug(
        `Playlist songs after population: Found ${populatedPlaylist.songs?.length || 0} songs`,
      );
      if (populatedPlaylist.songs?.length > 0) {
        // Log a sample song to check its structure
        this.logger.debug(
          'Sample song from playlist:',
          JSON.stringify(populatedPlaylist.songs[0]),
        );
      } // Get followers count for this playlist
      const followersCount = await this.followPlaylistModel.countDocuments({
        playlistId: new Types.ObjectId(playlistId),
      });

      // Process signed URL for cover
      let cover = populatedPlaylist.cover;
      if (cover && cover.includes('storage.googleapis.com')) {
        try {
          cover = await this.firebaseService.getSignedUrl(cover);
        } catch (error) {
          console.error('Error getting signed URL for playlist cover:', error);
          // Keep original URL if signing fails
        }
      }

      return {
        success: true,
        data: {
          ...populatedPlaylist,
          followersCount,
          cover,
        },
      };
    } catch (error) {
      console.error('Error fetching playlist details:', error);
      return {
        success: false,
        message: 'Failed to retrieve playlist details',
        error: error.message,
      };
    }
  }

  async findPlaylistsByUserId(
    userId: string,
    visibility?: string,
    currentUserId?: string | null,
  ) {
    try {
      if (!isValidObjectId(userId)) {
        throw new NotFoundException('Invalid user ID format');
      }

      // Build the basic query with ObjectId
      const userIdObj = new Types.ObjectId(userId);
      const query: any = { userId: userIdObj };

      // If visibility is specified, add it to the query
      if (visibility) {
        query.visibility = visibility.toUpperCase();
      }
      // If no visibility specified but this is not the current user's playlists,
      // then only show public playlists
      else if (userId !== currentUserId) {
        query.visibility = 'PUBLIC';
      }

      this.logger.debug(
        'Playlist query:',
        query,
        'Current user ID:',
        currentUserId,
      );

      // First try with ObjectId and explicit population
      let playlists = await this.playlistModel
        .find(query)
        .sort({ createdAt: -1 })
        .populate('userId', '_id name username profilePicture')
        .populate({
          path: 'songs',
          model: 'Song',
          select: '_id title artist album duration coverImage audioUrl',
        })
        .lean();

      this.logger.debug(
        `Found ${playlists.length} playlists for userId as ObjectId: ${userId}`,
      );

      // If no results, try with string userId as fallback
      if (playlists.length === 0) {
        this.logger.debug('Trying fallback with string userId');
        const stringQuery = { ...query, userId: userId.toString() };

        playlists = await this.playlistModel
          .find(stringQuery)
          .sort({ createdAt: -1 })
          .populate('userId', '_id name username profilePicture')
          .populate({
            path: 'songs',
            model: 'Song',
            select: '_id title artist album duration coverImage audioUrl',
          })
          .lean();

        this.logger.debug(
          `Fallback found ${playlists.length} playlists for string userId: ${userId}`,
        );
      } // Log sample data for debugging
      if (playlists.length > 0) {
        this.logger.debug('Sample playlist:', {
          id: playlists[0]._id,
          name: playlists[0].name,
          songCount: playlists[0].songs?.length || 0,
        });

        // Log a sample song if available
        if (playlists[0].songs && playlists[0].songs.length > 0) {
          this.logger.debug(
            'Sample song:',
            JSON.stringify(playlists[0].songs[0]),
          );
        }
      }

      // Process signed URLs for covers
      const playlistsWithSignedCovers = await Promise.all(
        playlists.map(async (playlist) => {
          let cover = playlist.cover;
          if (cover && cover.includes('storage.googleapis.com')) {
            try {
              cover = await this.firebaseService.getSignedUrl(cover);
            } catch (error) {
              console.error(
                'Error getting signed URL for playlist cover:',
                error,
              );
              // Keep original URL if signing fails
            }
          }
          return { ...playlist, cover };
        }),
      );

      return {
        success: true,
        data: playlistsWithSignedCovers,
      };
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      return {
        success: false,
        message: 'Failed to retrieve user playlists',
        error: error.message,
      };
    }
  }

  async reorderSongs(
    playlistId: string,
    userId: string,
    reorderSongsDto: ReorderSongsDto,
  ) {
    try {
      if (!isValidObjectId(playlistId)) {
        return {
          success: false,
          message: 'Invalid playlist ID format',
          statusCode: 400, // Bad Request
        };
      }

      const playlist = await this.playlistModel.findById(playlistId);
      if (!playlist) {
        return {
          success: false,
          message: 'Playlist not found',
          statusCode: 404, // Not Found
        };
      }

      // Check if user owns this playlist
      if (playlist.userId.toString() !== userId) {
        return {
          success: false,
          message: 'You do not have permission to modify this playlist',
          statusCode: 403, // Forbidden
        };
      }

      const { songIds } = reorderSongsDto;

      // Verify all songs in the new order exist in the playlist
      const currentSongIds = playlist.songs.map((id) => id.toString());
      const allSongsExist = songIds.every((id) => currentSongIds.includes(id));

      if (!allSongsExist) {
        return {
          success: false,
          message: 'The new order contains songs that are not in the playlist',
          statusCode: 400, // Bad Request
        };
      }

      // Verify the count of songs is the same
      if (songIds.length !== playlist.songs.length) {
        return {
          success: false,
          message: 'The new order must contain all songs from the playlist',
          statusCode: 400, // Bad Request
        };
      }

      // Update the playlist with the new song order
      playlist.songs = songIds.map((id) => new Types.ObjectId(id));
      await playlist.save(); // Fetch the updated playlist with populated songs
      const updatedPlaylist = await this.playlistModel
        .findById(playlistId)
        .populate('userId', '_id name username profilePicture')
        .populate({
          path: 'songs',
          model: 'Song',
          select: '_id title artist album duration coverImage audioUrl',
        })
        .lean();

      if (!updatedPlaylist) {
        return {
          success: false,
          message: 'Failed to retrieve updated playlist',
          statusCode: 500,
        };
      }

      this.logger.debug('Reordered songs in playlist:', {
        playlistId,
        songCount: updatedPlaylist.songs?.length || 0,
      });

      return {
        success: true,
        data: updatedPlaylist,
        message: 'Playlist songs reordered successfully',
      };
    } catch (error) {
      console.error('Error reordering songs in playlist:', error);
      return {
        success: false,
        message: 'Failed to reorder songs in playlist',
        error: error.message,
        statusCode: 500, // Internal Server Error
      };
    }
  }

  async getPlaylistWithFollowersCount(playlistId: string) {
    try {
      const playlist = await this.playlistModel
        .findById(playlistId)
        .populate('userId', '_id name username profilePicture')
        .populate({
          path: 'songs',
          model: 'Song',
          select: '_id title artist album duration coverImage audioUrl',
        })
        .lean();

      if (!playlist) {
        return {
          success: false,
          message: 'Playlist not found',
          statusCode: 404,
        };
      }

      // Get followers count
      const followersCount = await this.followPlaylistModel.countDocuments({
        playlistId: new Types.ObjectId(playlistId),
      });

      return {
        success: true,
        data: {
          ...playlist,
          followersCount,
        },
      };
    } catch (error) {
      console.error('Error getting playlist with followers count:', error);
      return {
        success: false,
        message: 'Failed to get playlist details',
        error: error.message,
        statusCode: 500,
      };
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
}
