import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PlaybackService } from './playback.service';

@Controller('playback')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Post('session')
  async saveSession(
    @Body()
    body: {
      userId: string;
      trackId: string;
      position: number;
      duration: number;
    },
  ) {
    const { userId, trackId, position, duration } = body;
    const session = await this.playbackService.saveSession(
      userId,
      trackId,
      position,
      duration,
    );
    return { success: true, data: session };
  }

  @Get('session')
  async getSession(
    @Query('userId') userId: string,
    @Query('trackId') trackId: string,
  ) {
    const session = await this.playbackService.getSession(userId, trackId);
    return { success: true, data: session };
  }
}
