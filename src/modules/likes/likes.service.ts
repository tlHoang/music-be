import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like } from './schemas/like.schema';
import { CreateLikeDto } from './dto/create-like.dto';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
  ) {}

  create(createLikeDto: CreateLikeDto) {
    return this.likeModel.create(createLikeDto);
  }

  remove(id: string) {
    return this.likeModel.findByIdAndDelete(id).exec();
  }
}
