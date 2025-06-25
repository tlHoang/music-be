import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PaymentOrderMap extends Document {
  @Prop({ required: true, unique: true })
  orderCode: number;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  plan: string;
}

export const PaymentOrderMapSchema =
  SchemaFactory.createForClass(PaymentOrderMap);
