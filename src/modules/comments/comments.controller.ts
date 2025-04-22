import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Comment created successfully')
  create(@Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.create(createCommentDto);
  }

  @Get()
  @Public()
  findAll() {
    return this.commentsService.findAll();
  }

  @Get('song/:songId')
  @Public()
  @ResponseMessage('Comments retrieved successfully')
  findBySongId(@Param('songId') songId: string) {
    return this.commentsService.findBySongId(songId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Comment updated successfully')
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(id, updateCommentDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  @ResponseMessage('Comment deleted successfully')
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}
