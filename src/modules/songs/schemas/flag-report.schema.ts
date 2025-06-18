import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FlagReportDocument = FlagReport & Document;

@Schema({ timestamps: true })
export class FlagReport {
  @Prop({ type: Types.ObjectId, ref: 'Song', required: true })
  songId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy: Types.ObjectId;

  @Prop({
    enum: [
      'INAPPROPRIATE_CONTENT',
      'COPYRIGHT_INFRINGEMENT',
      'SPAM',
      'HARASSMENT',
      'OTHER',
    ],
    required: true,
  })
  reason: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({ enum: ['PENDING', 'REVIEWED', 'DISMISSED'], default: 'PENDING' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop({ maxlength: 500 })
  reviewNotes?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FlagReportSchema = SchemaFactory.createForClass(FlagReport);

// Create compound index to prevent duplicate reports from same user for same song
FlagReportSchema.index({ songId: 1, reportedBy: 1 }, { unique: true });
