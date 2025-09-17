import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Get,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtService } from '@nestjs/jwt';

@Controller('likes')
export class LikesController {
  constructor(
    private readonly likesService: LikesService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Like added successfully')
  create(@Body() createLikeDto: CreateLikeDto) {
    return this.likesService.create(createLikeDto);
  }

  @Post('like/:songId')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Song liked successfully')
  async like(@Param('songId') songId: string, @Request() req) {
    const userId = req.user._id;
    return this.likesService.likeSong(userId, songId);
  }

  @Post('unlike/:songId')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Song unliked successfully')
  async unlike(@Param('songId') songId: string, @Request() req) {
    const userId = req.user._id;
    return this.likesService.unlikeSong(userId, songId);
  }

  @Get('status/:songId')
  @Public()
  @ResponseMessage('Like status retrieved')
  async getLikeStatus(
    @Param('songId') songId: string,
    @Request() req,
    @Headers('authorization') authHeader: string,
  ) {
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.decode(token);
        userId = decoded.sub;
      } catch (error) {
        console.log('Token validation failed:', error.message);
      }
    }

    // Get like count
    const likeCount = await this.likesService.countLikes(songId);

    // Return early if no user ID
    if (!userId) {
      return {
        isLiked: false,
        likeCount,
      };
    }

    const like = await this.likesService.findByUserAndSong(userId, songId);

    const likeStatus = {
      isLiked: !!like,
      likeId: like?._id,
      likeCount,
    };
    console.log(likeStatus);
    return likeStatus;
  }

  @Get('count/:songId')
  @Public()
  @ResponseMessage('Like count retrieved')
  async getLikeCount(@Param('songId') songId: string) {
    const count = await this.likesService.countLikes(songId);
    return { count };
  }

  @Get('check/:songId')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Like check retrieved')
  async checkLike(@Param('songId') songId: string, @Request() req) {
    const userId = req.user._id;
    const like = await this.likesService.findByUserAndSong(userId, songId);
    return {
      liked: !!like,
      likeId: like?._id,
    };
  }

  @Delete('song/:songId')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Like removed successfully')
  async removeByUserAndSong(@Param('songId') songId: string, @Request() req) {
    const userId = req.user._id;
    return this.likesService.removeByUserAndSong(userId, songId);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Like removed successfully')
  remove(@Param('id') id: string) {
    return this.likesService.remove(id);
  }
}
