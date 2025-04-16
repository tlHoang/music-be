import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Playlist } from './schemas/playlist.schema';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectModel(Playlist.name) private readonly playlistModel: Model<Playlist>,
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
}
