import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GenreSong } from './schemas/genre-song.schema';
import { CreateGenreSongDto } from './dto/create-genre-song.dto';

@Injectable()
export class GenreSongService {
  constructor(
    @InjectModel(GenreSong.name)
    private readonly genreSongModel: Model<GenreSong>,
  ) {}

  create(createGenreSongDto: CreateGenreSongDto) {
    return this.genreSongModel.create(createGenreSongDto);
  }

  remove(id: string) {
    return this.genreSongModel.findByIdAndDelete(id).exec();
  }
}
