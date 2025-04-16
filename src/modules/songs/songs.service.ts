import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song } from './schemas/song.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { Genre } from '@/modules/genres/schemas/genre.schema';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
  ) {}

  create(createSongDto: CreateSongDto) {
    return this.songModel.create(createSongDto);
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
