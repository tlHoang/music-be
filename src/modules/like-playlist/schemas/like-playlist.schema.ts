import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikePlaylistDocument = LikePlaylist & Document;

@Schema({ timestamps: true })
export class LikePlaylist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Playlist', required: true })
  playlistId: Types.ObjectId;
}

export const LikePlaylistSchema = SchemaFactory.createForClass(LikePlaylist);
