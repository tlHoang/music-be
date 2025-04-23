import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowerDocument = Follower & Document;

@Schema({ timestamps: true })
export class Follower {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followingId: Types.ObjectId;

  // Timestamps added by the schema options, but need to be declared for TypeScript
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FollowerSchema = SchemaFactory.createForClass(Follower);
