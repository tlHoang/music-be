import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SongPlaylist } from './schemas/song-playlist.schema';
import { CreateSongPlaylistDto } from './dto/create-song-playlist.dto';

@Injectable()
export class SongPlaylistService {
  constructor(
    @InjectModel(SongPlaylist.name)
    private readonly songPlaylistModel: Model<SongPlaylist>,
  ) {}

  create(createSongPlaylistDto: CreateSongPlaylistDto) {
    return this.songPlaylistModel.create(createSongPlaylistDto);
  }

  remove(id: string) {
    return this.songPlaylistModel.findByIdAndDelete(id).exec();
  }
}
