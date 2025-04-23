import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlaylistDocument = Playlist & Document;

@Schema({ timestamps: true })
export class Playlist {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Song' }] })
  songs: Types.ObjectId[];

  @Prop({ default: 'PUBLIC', enum: ['PUBLIC', 'PRIVATE'] })
  visibility: string;

  @Prop({ default: false })
  isFeatured: boolean;

  // Timestamps added by the schema options, but need to be declared for TypeScript
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);
