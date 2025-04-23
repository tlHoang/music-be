import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Playlist } from './schemas/playlist.schema';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectModel(Playlist.name) private readonly playlistModel: Model<Playlist>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  create(createPlaylistDto: CreatePlaylistDto) {
    return this.playlistModel.create(createPlaylistDto);
  }

  findAll() {
    return this.playlistModel.find().exec();
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

      // Enhance playlists with song count information
      const enhancedPlaylists = playlists.map((playlist) => {
        return {
          ...playlist,
          songCount: playlist.songs ? playlist.songs.length : 0,
        };
      });

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
}
