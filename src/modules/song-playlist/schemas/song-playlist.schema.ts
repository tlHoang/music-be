import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SongPlaylistDocument = SongPlaylist & Document;

@Schema({ timestamps: true })
export class SongPlaylist {
  @Prop({ type: Types.ObjectId, ref: 'Song', required: true })
  songId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Playlist', required: true })
  playlistId: Types.ObjectId;
}

export const SongPlaylistSchema = SchemaFactory.createForClass(SongPlaylist);
