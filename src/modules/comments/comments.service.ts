import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Song } from '@/modules/songs/schemas/song.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Song.name) private readonly songModel: Model<Song>,
  ) {}

  async create(createCommentDto: CreateCommentDto) {
    const comment = await this.commentModel.create(createCommentDto);

    await this.songModel.findByIdAndUpdate(
      createCommentDto.songId,
      { $inc: { commentCount: 1 } },
      { new: true },
    );

    return comment;
  }

  findAll() {
    return this.commentModel.find().exec();
  }

  async findBySongId(songId: string) {
    // Restore populate to return user info for userId
    return this.commentModel
      .find({ songId })
      .populate('userId', 'name username email profilePicture _id')
      .sort({ createdAt: -1 })
      .exec();
  }

  findOne(id: string) {
    return this.commentModel.findById(id).exec();
  }

  update(id: string, updateCommentDto: UpdateCommentDto) {
    return this.commentModel
      .findByIdAndUpdate(id, updateCommentDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    // Find the comment to get the songId before deleting
    const comment = await this.commentModel.findById(id).exec();

    if (!comment) {
      return null;
    }

    // Delete the comment
    const result = await this.commentModel.findByIdAndDelete(id).exec();

    if (result) {
      // Decrement the commentCount in the song document, ensuring it doesn't go below 0
      await this.songModel.findByIdAndUpdate(
        comment.songId,
        { $inc: { commentCount: -1 } },
        { new: true },
      );
    }

    return result;
  }
}
