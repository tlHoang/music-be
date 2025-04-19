import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song } from './schemas/song.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { Genre } from '@/modules/genres/schemas/genre.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>, // Inject User model
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
    return this.songModel.find({ userId });
  }

  // async findGenresBySong(songId: string): Promise<Genre[]> {
  //   const song = await this.songModel
  //     .findById(songId)
  //     .populate('genres')
  //     .exec();
  //   if (!song) {
  //     throw new Error('Song not found');
  //   }
  //   return song.genres as Genre[];
  // }
}
