import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like } from './schemas/like.schema';
import { CreateLikeDto } from './dto/create-like.dto';
import { Song } from '@/modules/songs/schemas/song.schema';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
  ) {}

  async create(createLikeDto: CreateLikeDto) {
    // Check if like already exists to prevent duplicates
    const existingLike = await this.findByUserAndSong(
      createLikeDto.userId,
      createLikeDto.songId,
    );

    if (existingLike) {
      return existingLike;
    }

    return this.likeModel.create(createLikeDto);
  }

  // New method for the like endpoint
  async likeSong(userId: string, songId: string) {
    // Check if like already exists
    const existingLike = await this.findByUserAndSong(userId, songId);

    if (existingLike) {
      return existingLike;
    }

    // Create new like
    const newLike = await this.likeModel.create({
      userId,
      songId,
    });

    // Increment the likeCount in the song document
    await this.songModel.findByIdAndUpdate(
      songId,
      { $inc: { likeCount: 1 } },
      { new: true },
    );

    const likeCount = await this.countLikes(songId);

    return {
      like: newLike,
      likeCount,
      isLiked: true,
    };
  }

  // New method for the unlike endpoint
  async unlikeSong(userId: string, songId: string) {
    // Remove like and get result
    const result = await this.removeByUserAndSong(userId, songId);

    if (result) {
      // Decrement the likeCount in the song document, but ensure it doesn't go below 0
      await this.songModel.findByIdAndUpdate(
        songId,
        { $inc: { likeCount: -1 } },
        { new: true },
      );
    }

    const likeCount = await this.countLikes(songId);

    return {
      result,
      likeCount,
      isLiked: false,
    };
  }

  async findByUserAndSong(userId: string, songId: string) {
    return this.likeModel.findOne({ userId, songId }).exec();
  }

  async countLikes(songId: string): Promise<number> {
    return this.likeModel.countDocuments({ songId }).exec();
  }

  async removeByUserAndSong(userId: string, songId: string) {
    return this.likeModel.findOneAndDelete({ userId, songId }).exec();
  }

  remove(id: string) {
    return this.likeModel.findByIdAndDelete(id).exec();
  }
}
