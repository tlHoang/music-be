import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GenreDocument = Genre & Document;

@Schema({ timestamps: true })
export class Genre {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  // Removed redundant songs field
  // @Prop({ type: [{ type: Types.ObjectId, ref: 'Song' }] })
  // songs: Types.ObjectId[];
}

export const GenreSchema = SchemaFactory.createForClass(Genre);
