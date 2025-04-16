import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SongDocument = Song & Document;

@Schema({ timestamps: true })
export class Song {
  @Prop({ required: true })
  title: string;

  @Prop()
  duration: number;

  @Prop()
  uploadDate: Date;

  @Prop({ default: 0 })
  playCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop()
  lyrics: string;

  @Prop({ required: true })
  audioUrl: string;

  @Prop()
  thumbnail: string;

  @Prop({ enum: ['PRIVATE', 'PUBLIC'], default: 'PUBLIC' })
  visibility: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Removed redundant genres field
  // @Prop({ type: [{ type: Types.ObjectId, ref: 'Genre' }] })
  // genres: Types.ObjectId[]; // Many-to-many relationship with Genre
}

export const SongSchema = SchemaFactory.createForClass(Song);
