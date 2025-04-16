import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User extends Document {
  declare readonly _id: Types.ObjectId;

  @Prop()
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop({ default: 'LOCAL' })
  accountType: string;

  @Prop({ default: 'USER' })
  role: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  codeId: string;

  @Prop()
  codeExpired: Date;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: false })
  profilePicture: string;

  @Prop({ required: false })
  bio: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Song' }] })
  songs: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Playlist' }] })
  playlists: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
