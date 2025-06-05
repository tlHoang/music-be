import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlaybackSession,
  PlaybackSessionSchema,
} from './playback-session.schema';
import { PlaybackService } from './playback.service';
import { PlaybackController } from './playback.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlaybackSession.name, schema: PlaybackSessionSchema },
    ]),
  ],
  providers: [PlaybackService],
  controllers: [PlaybackController],
  exports: [PlaybackService],
})
export class PlaybackModule {}
