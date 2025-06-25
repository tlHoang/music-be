import { Injectable, Logger } from '@nestjs/common';
import PayOS from '@payos/node';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlan } from '../subscriptions/schemas/subscription.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentOrderMap } from './schemas/payment-order-map.schema';
import { PaymentWebhookDto } from './dto/payment.dto';

interface WebhookType {
  code: string;
  desc: string;
  success: boolean;
  signature: string;
  data: {
    code: string;
    desc: string;
    orderCode: number;
    status: string;
    amount: number;
    description: string;
    paymentLinkId: string;
    currency: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    buyerName?: string;
    buyerEmail?: string;
    // Only include fields required by SDK and used in your app
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private payOS: PayOS;

  constructor(
    private readonly subscriptionsService?: SubscriptionsService,
    @InjectModel(PaymentOrderMap.name)
    private readonly paymentOrderMapModel?: Model<PaymentOrderMap>,
  ) {
    // Initialize PayOS with credentials from environment variables
    this.payOS = new PayOS(
      process.env.PAYOS_CLIENT_ID || '',
      process.env.PAYOS_API_KEY || '',
      process.env.PAYOS_CHECKSUM_KEY || '',
    );
  }

  async createPaymentLink(data: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl?: string;
    cancelUrl?: string;
    buyerName?: string;
    buyerEmail?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }) {
    try {
      const paymentData = {
        orderCode: data.orderCode,
        amount: data.amount,
        description: data.description,
        returnUrl:
          data.returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
        cancelUrl:
          data.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        ...(data.buyerName && { buyerName: data.buyerName }),
        ...(data.buyerEmail && { buyerEmail: data.buyerEmail }),
        ...(data.items && { items: data.items }),
      };

      this.logger.log(`Creating payment link for order: ${data.orderCode}`);
      const paymentLinkRes = await this.payOS.createPaymentLink(paymentData);

      return {
        success: true,
        data: paymentLinkRes,
      };
    } catch (error: unknown) {
      this.logger.error('Error creating payment link:', error);
      throw new Error(
        `Failed to create payment link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPaymentInfo(orderCode: number) {
    try {
      this.logger.log(`Getting payment info for order: ${orderCode}`);
      const paymentInfo = await this.payOS.getPaymentLinkInformation(orderCode);

      return {
        success: true,
        data: paymentInfo,
      };
    } catch (error: unknown) {
      this.logger.error('Error getting payment info:', error);
      throw new Error(
        `Failed to get payment info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async cancelPayment(orderCode: number, reason?: string) {
    try {
      this.logger.log(`Canceling payment for order: ${orderCode}`);
      const cancelResult = await this.payOS.cancelPaymentLink(
        orderCode,
        reason || 'User requested cancellation',
      );

      return {
        success: true,
        data: cancelResult,
      };
    } catch (error: unknown) {
      this.logger.error('Error canceling payment:', error);
      throw new Error(
        `Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createSubscriptionPayment(data: {
    userId: string;
    plan: SubscriptionPlan;
    durationMonths?: number;
    buyerName?: string;
    buyerEmail?: string;
  }) {
    try {
      const prices = {
        [SubscriptionPlan.FREE]: 0,
        [SubscriptionPlan.PREMIUM]: 10000, // match frontend
        [SubscriptionPlan.PREMIUM_PLUS]: 25000, // match frontend
      };

      const planNames = {
        [SubscriptionPlan.FREE]: 'Free Plan',
        [SubscriptionPlan.PREMIUM]: 'Premium Plan',
        [SubscriptionPlan.PREMIUM_PLUS]: 'Premium Plus Plan',
      };

      const amount = prices[data.plan] * (data.durationMonths || 1);
      const orderCode = Date.now();

      if (amount === 0) {
        // For free plan, create subscription directly
        if (this.subscriptionsService) {
          await this.subscriptionsService.createSubscription(
            data.userId,
            data.plan,
            `free-${orderCode}`,
            data.durationMonths || 0,
          );
        }

        return {
          success: true,
          data: {
            orderCode,
            amount: 0,
            checkoutUrl: null,
            qrCode: null,
            plan: data.plan,
            message: 'Free plan activated successfully',
          },
        };
      }

      // Store orderCode-userId-plan mapping for webhook
      if (this.paymentOrderMapModel) {
        await this.paymentOrderMapModel.create({
          orderCode,
          userId: data.userId,
          plan: data.plan,
        });
      }

      const paymentData = {
        orderCode,
        amount,
        description: `${planNames[data.plan]} - ${data.durationMonths || 1} month(s)`,
        returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
        cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
        ...(data.buyerName && { buyerName: data.buyerName }),
        ...(data.buyerEmail && { buyerEmail: data.buyerEmail }),
        items: [
          {
            name: planNames[data.plan],
            quantity: data.durationMonths || 1,
            price: prices[data.plan],
          },
        ],
      };

      this.logger.log(
        `Creating subscription payment for ${data.plan}: ${data.userId}`,
      );
      const paymentLinkRes = await this.payOS.createPaymentLink(paymentData);

      return {
        success: true,
        data: {
          ...paymentLinkRes,
          plan: data.plan,
          userId: data.userId,
          durationMonths: data.durationMonths || 1,
        },
      };
    } catch (error: unknown) {
      this.logger.error('Error creating subscription payment:', error);
      throw new Error(
        `Failed to create subscription payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async activateSubscriptionByOrderCode(orderCode: number) {
    this.logger.log(
      `[activateSubscriptionByOrderCode] Called with orderCode:`,
      orderCode,
    );
    if (!this.paymentOrderMapModel || !this.subscriptionsService) {
      this.logger.error(
        `[activateSubscriptionByOrderCode] paymentOrderMapModel or subscriptionsService missing`,
      );
      return;
    }
    const map = await this.paymentOrderMapModel.findOne({ orderCode });
    this.logger.log(
      `[activateSubscriptionByOrderCode] PaymentOrderMap lookup result:`,
      map,
    );
    if (map) {
      try {
        const result = await this.subscriptionsService.createSubscription(
          map.userId,
          map.plan as SubscriptionPlan,
          String(orderCode),
          1,
        );
        this.logger.log(
          `[activateSubscriptionByOrderCode] Subscription creation result:`,
          result,
        );
        await this.paymentOrderMapModel.deleteOne({ orderCode });
        this.logger.log(
          `[activateSubscriptionByOrderCode] Deleted payment mapping for orderCode`,
          orderCode,
        );
        this.logger.log(
          `Activated subscription for user ${map.userId} plan ${map.plan}`,
        );
      } catch (err) {
        this.logger.error(
          `[activateSubscriptionByOrderCode] Error creating subscription:`,
          err,
        );
      }
    } else {
      this.logger.warn(
        `[activateSubscriptionByOrderCode] No payment mapping found for orderCode ${orderCode}`,
      );
    }
  }

  verifyPaymentWebhookData(webhookData: WebhookType) {
    try {
      // PayOS provides built-in webhook verification
      const isValid = this.payOS.verifyPaymentWebhookData(webhookData);
      return isValid;
    } catch (error: unknown) {
      this.logger.error('Error verifying webhook data:', error);
      return false;
    }
  }

  // Get all payment orders for a user (for payment history)
  async getUserPaymentHistory(userId: string) {
    if (!this.paymentOrderMapModel) {
      this.logger.error('[getUserPaymentHistory] paymentOrderMapModel missing');
      return [];
    }
    try {
      const history = await this.paymentOrderMapModel
        .find({ userId })
        .sort({ orderCode: -1 })
        .lean();
      return history;
    } catch (error: unknown) {
      this.logger.error('Error fetching payment history:', error);
      throw new Error(
        `Failed to fetch payment history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Get current subscription plan for a user
  async getUserCurrentSubscription(userId: string) {
    if (!this.subscriptionsService) {
      this.logger.error(
        '[getUserCurrentSubscription] subscriptionsService missing',
      );
      return null;
    }
    try {
      // Use the correct method name from SubscriptionsService
      const current =
        await this.subscriptionsService.getUserSubscription(userId);
      return current;
    } catch (error: unknown) {
      this.logger.error('Error fetching current subscription:', error);
      throw new Error(
        `Failed to fetch current subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async handlePaymentWebhook(webhookData: unknown) {
    this.logger.log(
      '[handlePaymentWebhook] Webhook received:',
      JSON.stringify(webhookData),
    );
    // Type guard for PaymentWebhookDto
    const dataObj = webhookData as PaymentWebhookDto;
    // 1. Verify webhook signature
    const isValid = this.verifyPaymentWebhookData(dataObj as any); // Cast if needed
    if (!isValid) {
      this.logger.warn('[handlePaymentWebhook] Invalid webhook signature');
      return { success: false, message: 'Invalid signature' };
    }
    // 2. Check payment status
    const data = dataObj.data;
    if (data && data.status === 'PAID') {
      this.logger.log(
        '[handlePaymentWebhook] Payment is PAID, activating subscription for orderCode:',
        data.orderCode,
      );
      await this.activateSubscriptionByOrderCode(Number(data.orderCode));
      return { success: true, message: 'Subscription activated' };
    } else {
      this.logger.log(
        '[handlePaymentWebhook] Payment status is not PAID:',
        data?.status,
      );
      return { success: false, message: 'Payment not completed' };
    }
  }
}
