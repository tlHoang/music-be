import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { FollowersService } from './followers.service';
import { CreateFollowerDto } from './dto/create-follower.dto';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

@ApiTags('followers')
@Controller('followers')
export class FollowersController {
  constructor(
    private readonly followersService: FollowersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  create(@Body() createFollowerDto: CreateFollowerDto, @Req() req: Request) {
    // Add the follower ID from the authenticated user
    const userId = this.jwtService.decode(
      req.headers.authorization!.split(' ')[1],
    ).sub;
    return this.followersService.create({
      ...createFollowerDto,
      // followerId: req.user?._id,
      followerId: userId,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = this.jwtService.decode(
      req.headers.authorization!.split(' ')[1],
    ).sub;
    // return this.followersService.remove(id, req.user?._id);
    return this.followersService.remove(id, userId);
  }

  @Get(':userId/followers')
  getFollowers(@Param('userId') id: string, @Req() req: Request) {
    // Get all users who follow the specified user
    const userId = this.jwtService.decode(
      req.headers.authorization!.split(' ')[1],
    ).sub;
    // return this.followersService.findFollowers(userId, req.user?._id);
    return this.followersService.findFollowers(id, userId);
  }

  @Get(':userId/following')
  getFollowing(@Param('userId') id: string, @Req() req: Request) {
    // Get all users that the specified user follows
    // return this.followersService.findFollowing(userId, req.user?._id);
    const userId = this.jwtService.decode(
      req.headers.authorization!.split(' ')[1],
    ).sub;
    return this.followersService.findFollowing(id, userId);
  }
}
