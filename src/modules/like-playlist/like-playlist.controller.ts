import { Controller, Post, Body, Param, Delete } from '@nestjs/common';
import { LikePlaylistService } from './like-playlist.service';
import { CreateLikePlaylistDto } from './dto/create-like-playlist.dto';

@Controller('like-playlist')
export class LikePlaylistController {
  constructor(private readonly likePlaylistService: LikePlaylistService) {}

  @Post()
  create(@Body() createLikePlaylistDto: CreateLikePlaylistDto) {
    return this.likePlaylistService.create(createLikePlaylistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.likePlaylistService.remove(id);
  }
}
