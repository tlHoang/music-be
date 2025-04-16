import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Follower } from './schemas/follower.schema';
import { CreateFollowerDto } from './dto/create-follower.dto';

@Injectable()
export class FollowersService {
  constructor(
    @InjectModel(Follower.name) private readonly followerModel: Model<Follower>,
  ) {}

  create(createFollowerDto: CreateFollowerDto) {
    return this.followerModel.create(createFollowerDto);
  }

  remove(id: string) {
    return this.followerModel.findByIdAndDelete(id).exec();
  }
}
