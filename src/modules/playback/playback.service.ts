import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlaybackSession } from './playback-session.schema';

@Injectable()
export class PlaybackService {
  constructor(
    @InjectModel(PlaybackSession.name)
    private readonly playbackSessionModel: Model<PlaybackSession>,
  ) {}

  async saveSession(
    userId: string,
    trackId: string,
    position: number,
    duration: number,
  ) {
    // Upsert session for user/track
    return this.playbackSessionModel.findOneAndUpdate(
      { userId, trackId },
      { userId, trackId, position, duration },
      { upsert: true, new: true },
    );
  }

  async getSession(userId: string, trackId: string) {
    return this.playbackSessionModel.findOne({ userId, trackId });
  }
}
