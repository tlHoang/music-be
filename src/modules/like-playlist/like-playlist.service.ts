import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LikePlaylist } from './schemas/like-playlist.schema';
import { CreateLikePlaylistDto } from './dto/create-like-playlist.dto';

@Injectable()
export class LikePlaylistService {
  constructor(
    @InjectModel(LikePlaylist.name)
    private readonly likePlaylistModel: Model<LikePlaylist>,
  ) {}

  create(createLikePlaylistDto: CreateLikePlaylistDto) {
    return this.likePlaylistModel.create(createLikePlaylistDto);
  }

  remove(id: string) {
    return this.likePlaylistModel.findByIdAndDelete(id).exec();
  }
}
