import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Genre } from './schemas/genre.schema';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { Song } from '@/modules/songs/schemas/song.schema';

@Injectable()
export class GenresService {
  constructor(
    @InjectModel(Genre.name) private readonly genreModel: Model<Genre>,
  ) {}

  create(createGenreDto: CreateGenreDto) {
    return this.genreModel.create(createGenreDto);
  }

  findAll() {
    return this.genreModel.find().exec();
  }

  findOne(id: string) {
    return this.genreModel.findById(id).exec();
  }

  update(id: string, updateGenreDto: UpdateGenreDto) {
    return this.genreModel
      .findByIdAndUpdate(id, updateGenreDto, { new: true })
      .exec();
  }

  remove(id: string) {
    return this.genreModel.findByIdAndDelete(id).exec();
  }

  // async findSongsByGenre(genreId: string): Promise<Song[]> {
  //   const genre = await this.genreModel
  //     .findById(genreId)
  //     .populate('songs')
  //     .exec();
  //   if (!genre) {
  //     throw new Error('Genre not found');
  //   }
  //   return genre.songs as Song[];
  // }
}
