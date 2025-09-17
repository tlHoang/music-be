import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GenreSongDocument = GenreSong & Document;

@Schema({ timestamps: true })
export class GenreSong {
  @Prop({ type: Types.ObjectId, ref: 'Genre', required: true })
  genreId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Song', required: true })
  songId: Types.ObjectId;
}

export const GenreSongSchema = SchemaFactory.createForClass(GenreSong);
