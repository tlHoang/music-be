import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PlaybackSession extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  trackId: string;

  @Prop({ required: true })
  position: number;

  @Prop({ required: true })
  duration: number;
}

export const PlaybackSessionSchema =
  SchemaFactory.createForClass(PlaybackSession);
