import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PaymentOrderMap,
  PaymentOrderMapSchema,
} from './schemas/payment-order-map.schema';

@Module({
  imports: [
    SubscriptionsModule,
    MongooseModule.forFeature([
      { name: PaymentOrderMap.name, schema: PaymentOrderMapSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
