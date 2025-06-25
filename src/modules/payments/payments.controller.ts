import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  PaymentWebhookDto,
  CreateSubscriptionPaymentDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

// Add a type for the user property on the request object
interface AuthenticatedRequest extends Request {
  user: { _id: string };
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-subscription')
  @HttpCode(HttpStatus.OK)
  async createSubscriptionPayment(
    @Body() createSubscriptionDto: CreateSubscriptionPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const result = await this.paymentsService.createSubscriptionPayment({
        userId: req.user._id,
        plan: createSubscriptionDto.plan,
        durationMonths: createSubscriptionDto.durationMonths || 1,
        buyerName: createSubscriptionDto.buyerName,
        buyerEmail: createSubscriptionDto.buyerEmail,
      });

      return {
        success: true,
        message: 'Subscription payment created successfully',
        data: result.data,
      };
    } catch (error: unknown) {
      this.logger.error('Error in createSubscriptionPayment:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
  @Post('create-link')
  @Public()
  @HttpCode(HttpStatus.OK)
  async createPaymentLink(
    @Body() createPaymentDto: CreatePaymentDto,
    // @Req() req, // removed unused req
  ) {
    try {
      // Generate unique order code
      const orderCode = Date.now();

      const result = await this.paymentsService.createPaymentLink({
        orderCode,
        amount: createPaymentDto.amount,
        description: createPaymentDto.description,
        returnUrl: createPaymentDto.returnUrl,
        cancelUrl: createPaymentDto.cancelUrl,
        buyerName: createPaymentDto.buyerName,
        buyerEmail: createPaymentDto.buyerEmail,
        items: createPaymentDto.items,
      });

      return {
        success: true,
        message: 'Payment link created successfully',
        data: {
          orderCode,
          checkoutUrl: result.data.checkoutUrl,
          qrCode: result.data.qrCode,
        },
      };
    } catch (error: unknown) {
      this.logger.error('Error in createPaymentLink:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Get('info/:orderCode')
  async getPaymentInfo(@Param('orderCode') orderCode: string) {
    try {
      const result = await this.paymentsService.getPaymentInfo(
        Number(orderCode),
      );
      return {
        success: true,
        message: 'Payment info retrieved successfully',
        data: result.data,
      };
    } catch (error: unknown) {
      this.logger.error('Error in getPaymentInfo:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Post('cancel/:orderCode')
  @HttpCode(HttpStatus.OK)
  async cancelPayment(
    @Param('orderCode') orderCode: string,
    @Body('reason') reason?: string,
  ) {
    try {
      const result = await this.paymentsService.cancelPayment(
        Number(orderCode),
        reason,
      );
      return {
        success: true,
        message: 'Payment canceled successfully',
        data: result.data,
      };
    } catch (error: unknown) {
      this.logger.error('Error in cancelPayment:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log(
      'Webhook (relaxed) called with body:',
      JSON.stringify(body),
    );
    try {
      // Only process if body.success is true and orderCode exists
      if (body && body.success === true && body.data && body.data.orderCode) {
        this.logger.log(
          'Webhook: Payment is successful, activating subscription for orderCode:',
          body.data.orderCode,
        );
        await this.paymentsService.activateSubscriptionByOrderCode(
          Number(body.data.orderCode),
        );
        return { success: true, message: 'Subscription activated' };
      }
      this.logger.log('Webhook: Payment not successful or missing orderCode.');
      return {
        success: false,
        message: 'Payment not successful or missing orderCode',
      };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Public()
  @Get('return')
  handleReturn(
    @Query('code') code: string,
    @Query('id') id: string,
    @Query('cancel') cancel: string,
    @Query('status') status: string,
    @Query('orderCode') orderCode: string,
  ) {
    try {
      this.logger.log(
        `Payment return: orderCode=${orderCode}, status=${status}`,
      );

      if (cancel === 'true' || status === 'CANCELLED') {
        return {
          success: false,
          message: 'Payment was cancelled',
          data: { orderCode, status: 'CANCELLED' },
        };
      }

      if (status === 'PAID') {
        return {
          success: true,
          message: 'Payment completed successfully',
          data: { orderCode, status: 'PAID' },
        };
      }

      return {
        success: false,
        message: 'Payment status unknown',
        data: { orderCode, status },
      };
    } catch (error: unknown) {
      this.logger.error('Error in handleReturn:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Get('current-subscription')
  async getCurrentSubscription(@Req() req: AuthenticatedRequest) {
    try {
      const current = await this.paymentsService.getUserCurrentSubscription(
        req.user._id,
      );
      return {
        success: true,
        data: current,
      };
    } catch (error: unknown) {
      this.logger.error('Error in getCurrentSubscription:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Get('payment-history')
  async getPaymentHistory(@Req() req: AuthenticatedRequest) {
    try {
      const history = await this.paymentsService.getUserPaymentHistory(
        req.user._id,
      );
      return {
        success: true,
        data: history,
      };
    } catch (error: unknown) {
      this.logger.error('Error in getPaymentHistory:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
