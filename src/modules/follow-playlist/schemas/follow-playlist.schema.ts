import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowPlaylistDocument = FollowPlaylist & Document;

@Schema({ timestamps: true })
export class FollowPlaylist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Playlist', required: true })
  playlistId: Types.ObjectId;

  // Timestamps added by the schema options, but need to be declared for TypeScript
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FollowPlaylistSchema =
  SchemaFactory.createForClass(FollowPlaylist);

// Create compound index to ensure a user can only follow a playlist once
FollowPlaylistSchema.index({ userId: 1, playlistId: 1 }, { unique: true });
