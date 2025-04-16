import { Controller, Post, Body, Param, Delete } from '@nestjs/common';
import { SongPlaylistService } from './song-playlist.service';
import { CreateSongPlaylistDto } from './dto/create-song-playlist.dto';

@Controller('song-playlist')
export class SongPlaylistController {
  constructor(private readonly songPlaylistService: SongPlaylistService) {}

  @Post()
  create(@Body() createSongPlaylistDto: CreateSongPlaylistDto) {
    return this.songPlaylistService.create(createSongPlaylistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.songPlaylistService.remove(id);
  }
}
