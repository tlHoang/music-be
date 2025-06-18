import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Song } from '../songs/schemas/song.schema';
import { Playlist } from '../playlists/schemas/playlist.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<Playlist>,
  ) {}

  async getStats() {
    try {
      // Get total counts
      const totalUsers = await this.userModel.countDocuments();
      const activeUsers = await this.userModel.countDocuments({
        $or: [
          { status: 'ACTIVE' },
          { status: { $exists: false }, isActive: true },
        ],
      });
      const totalSongs = await this.songModel.countDocuments();
      const publicSongs = await this.songModel.countDocuments({
        visibility: 'PUBLIC',
      });
      const privateSongs = await this.songModel.countDocuments({
        visibility: 'PRIVATE',
      });
      const totalPlaylists = await this.playlistModel.countDocuments();

      // Get new users in the past 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const newUsers = await this.userModel.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      });

      const newSongs = await this.songModel.countDocuments({
        uploadDate: { $gte: sevenDaysAgo },
      });

      // Get user growth data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Aggregate user registrations by date
      const userGrowth = await this.userModel.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]); // Get most active users (with most songs)
      const mostActiveUsers = await this.userModel.aggregate([
        {
          $lookup: {
            from: 'songs',
            localField: '_id',
            foreignField: 'userId',
            as: 'songs',
          },
        },
        {
          $project: {
            _id: 1,
            username: 1,
            email: 1,
            name: 1,
            songCount: { $size: '$songs' },
          },
        },
        { $sort: { songCount: -1 } },
        { $limit: 5 },
      ]);

      return {
        success: true,
        data: {
          counts: {
            totalUsers,
            activeUsers,
            totalSongs,
            publicSongs,
            privateSongs,
            totalPlaylists,
            newUsers,
            newSongs,
          },
          userGrowth,
          mostActiveUsers,
        },
      };
    } catch (error) {
      console.error('Error fetching admin statistics:', error);
      return {
        success: false,
        message: 'Failed to retrieve admin statistics',
        error: error.message,
      };
    }
  }

  async getActivity() {
    try {
      const recentLimit = 15;

      // Get recent user registrations
      const recentUsers = await this.userModel
        .find()
        .select('_id username email name createdAt')
        .sort({ createdAt: -1 })
        .limit(recentLimit)
        .lean();

      // Get recent song uploads
      const recentSongs = await this.songModel
        .find()
        .select('_id title uploadDate userId visibility')
        .populate('userId', '_id username email name')
        .sort({ uploadDate: -1 })
        .limit(recentLimit)
        .lean();

      // Get recent playlist creations
      const recentPlaylists = await this.playlistModel
        .find()
        .select('_id name createdAt userId visibility')
        .populate('userId', '_id username email name')
        .sort({ createdAt: -1 })
        .limit(recentLimit)
        .lean();

      // Format the data for the frontend
      const activities = [
        ...recentUsers.map((user) => ({
          type: 'USER_REGISTRATION',
          timestamp: user.createdAt,
          data: user,
        })),
        ...recentSongs.map((song) => ({
          type: 'SONG_UPLOAD',
          timestamp: song.uploadDate,
          data: song,
        })),
        ...recentPlaylists.map((playlist) => ({
          type: 'PLAYLIST_CREATION',
          timestamp: playlist.createdAt,
          data: playlist,
        })),
      ];

      // Sort all activities by timestamp (newest first)
      activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return {
        success: true,
        data: {
          activities: activities.slice(0, recentLimit),
        },
      };
    } catch (error) {
      console.error('Error fetching admin activity:', error);
      return {
        success: false,
        message: 'Failed to retrieve admin activity',
        error: error.message,
      };
    }
  }

  async getActivityPaginated(
    page: number,
    limit: number,
    activityType?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const recentLimit = limit;

      // Create queries with type filtering if provided
      const userQuery = {};
      const songQuery = {};
      const playlistQuery = {};

      // Get recent user registrations
      const recentUsers =
        activityType && activityType !== 'USER_REGISTERED'
          ? []
          : await this.userModel
              .find(userQuery)
              .select('_id username email name createdAt profilePicture')
              .sort({ createdAt: -1 })
              .lean();

      // Get recent song uploads
      const recentSongs =
        activityType && activityType !== 'TRACK_UPLOADED'
          ? []
          : await this.songModel
              .find(songQuery)
              .select('_id title uploadDate userId visibility plays')
              .populate('userId', '_id name email profilePicture')
              .sort({ uploadDate: -1 })
              .lean();

      // Get recent playlist creations
      const recentPlaylists =
        activityType && activityType !== 'PLAYLIST_CREATED'
          ? []
          : await this.playlistModel
              .find(playlistQuery)
              .select('_id name createdAt userId visibility')
              .populate('userId', '_id name email profilePicture')
              .sort({ createdAt: -1 })
              .lean();

      // Format the data for the frontend
      const allActivities = [
        ...recentUsers.map((user) => ({
          _id: `user_${user._id}`,
          type: 'USER_REGISTERED',
          message: 'registered a new account',
          timestamp: user.createdAt,
          userId: {
            _id: user._id,
            name: user.name || user.username,
            profilePicture: user.profilePicture,
          },
        })),
        ...recentSongs.map((song) => ({
          _id: `song_${song._id}`,
          type: 'TRACK_UPLOADED',
          message: `uploaded a new track "${song.title}"`,
          timestamp: song.uploadDate,
          userId: song.userId,
          targetId: song._id,
          targetType: 'TRACK',
          targetName: song.title,
        })),
        ...recentPlaylists.map((playlist) => ({
          _id: `playlist_${playlist._id}`,
          type: 'PLAYLIST_CREATED',
          message: `created a new playlist "${playlist.name}"`,
          timestamp: playlist.createdAt,
          userId: playlist.userId,
          targetId: playlist._id,
          targetType: 'PLAYLIST',
          targetName: playlist.name,
        })),
      ];

      // Sort all activities by timestamp (newest first)
      allActivities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Calculate pagination
      const totalActivities = allActivities.length;
      const totalPages = Math.ceil(totalActivities / limit);
      const paginatedActivities = allActivities.slice(skip, skip + limit);

      return {
        success: true,
        data: {
          activities: paginatedActivities,
          page,
          limit,
          total: totalActivities,
          pages: totalPages,
        },
      };
    } catch (error) {
      console.error('Error fetching paginated admin activity:', error);
      return {
        success: false,
        message: 'Failed to retrieve admin activity',
        error: error.message,
      };
    }
  }
}
