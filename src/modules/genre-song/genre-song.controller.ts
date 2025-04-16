import { Controller, Post, Body, Param, Delete } from '@nestjs/common';
import { GenreSongService } from './genre-song.service';
import { CreateGenreSongDto } from './dto/create-genre-song.dto';

@Controller('genre-song')
export class GenreSongController {
  constructor(private readonly genreSongService: GenreSongService) {}

  @Post()
  create(@Body() createGenreSongDto: CreateGenreSongDto) {
    return this.genreSongService.create(createGenreSongDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.genreSongService.remove(id);
  }
}
