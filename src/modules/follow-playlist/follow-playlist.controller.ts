import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FollowPlaylistService } from './follow-playlist.service';
import { CreateFollowPlaylistDto } from './dto/create-follow-playlist.dto';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('follow-playlist')
@Controller('follow-playlist')
@ApiBearerAuth()
export class FollowPlaylistController {
  constructor(private readonly followPlaylistService: FollowPlaylistService) {}

  @Post()
  async followPlaylist(
    @Body() createFollowPlaylistDto: CreateFollowPlaylistDto,
  ) {
    return this.followPlaylistService.followPlaylist(createFollowPlaylistDto);
  }

  @Post(':playlistId/follow')
  async followPlaylistById(
    @Param('playlistId') playlistId: string,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user._id;
    return this.followPlaylistService.followPlaylist({ userId, playlistId });
  }

  @Delete(':playlistId/unfollow')
  async unfollowPlaylist(
    @Param('playlistId') playlistId: string,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user._id;
    return this.followPlaylistService.unfollowPlaylist(userId, playlistId);
  }

  @Get(':playlistId/status')
  async checkFollowStatus(
    @Param('playlistId') playlistId: string,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user._id;
    return this.followPlaylistService.checkFollowStatus(userId, playlistId);
  }
  @Get(':playlistId/followers')
  @Public()
  async getPlaylistFollowers(@Param('playlistId') playlistId: string) {
    return this.followPlaylistService.getPlaylistFollowers(playlistId);
  }

  @Get('user/followed')
  async getFollowedPlaylists(@Request() req) {
    const userId = req.user.userId || req.user._id;
    return this.followPlaylistService.getFollowedPlaylists(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.followPlaylistService.remove(id);
  }
}
