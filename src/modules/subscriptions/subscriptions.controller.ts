import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan } from './schemas/subscription.schema';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';

export class CreateSubscriptionDto {
  plan: SubscriptionPlan;
  paymentId: string;
  durationMonths?: number;
}

// Add a type for the user property on the request object
interface AuthenticatedRequest extends Request {
  user: { _id: string };
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  async getCurrentSubscription(@Request() req: AuthenticatedRequest) {
    return await this.subscriptionsService.getUserSubscription(req.user._id);
  }

  @Get('limits')
  async getUserLimits(@Request() req: AuthenticatedRequest) {
    return await this.subscriptionsService.getUserLimits(req.user._id);
  }

  @Get('stats')
  async getSubscriptionStats(@Request() req: AuthenticatedRequest) {
    return await this.subscriptionsService.getSubscriptionStats(req.user._id);
  }

  @Get('plans')
  getAllPlans() {
    return {
      success: true,
      data: [
        {
          id: SubscriptionPlan.FREE,
          name: 'Free',
          price: 0,
          duration: 'Forever',
          features: [
            'Upload up to 10 songs',
            'Create up to 5 playlists',
            'Max file size: 10MB',
            'Standard quality streaming',
          ],
          limits: this.subscriptionsService.getPlanLimits(
            SubscriptionPlan.FREE,
          ),
        },
        {
          id: SubscriptionPlan.PREMIUM,
          name: 'Premium',
          price: 50000,
          duration: 'Per month',
          features: [
            'Upload up to 100 songs',
            'Create up to 50 playlists',
            'Max file size: 50MB',
            'High-quality streaming',
            'Priority support',
          ],
          limits: this.subscriptionsService.getPlanLimits(
            SubscriptionPlan.PREMIUM,
          ),
        },
        {
          id: SubscriptionPlan.PREMIUM_PLUS,
          name: 'Premium Plus',
          price: 99000,
          duration: 'Per month',
          features: [
            'Unlimited song uploads',
            'Unlimited playlists',
            'Max file size: 100MB',
            'Lossless quality streaming',
            'Priority support',
            'Early access to new features',
          ],
          limits: this.subscriptionsService.getPlanLimits(
            SubscriptionPlan.PREMIUM_PLUS,
          ),
        },
      ],
    };
  }

  @Post('create')
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const subscription = await this.subscriptionsService.createSubscription(
      req.user._id,
      createSubscriptionDto.plan,
      createSubscriptionDto.paymentId,
      createSubscriptionDto.durationMonths || 1,
    );

    return {
      success: true,
      data: subscription,
      message: 'Subscription created successfully',
    };
  }

  @Post('cancel')
  async cancelSubscription(@Request() req: AuthenticatedRequest) {
    await this.subscriptionsService.cancelSubscription(req.user._id);

    return {
      success: true,
      message: 'Subscription cancelled successfully',
    };
  }

  @Get('check/songs/:count')
  async checkSongLimit(
    @Param('count') count: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.subscriptionsService.canUploadSong(
      req.user._id,
      parseInt(count),
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('check/playlists/:count')
  async checkPlaylistLimit(
    @Param('count') count: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.subscriptionsService.canCreatePlaylist(
      req.user._id,
      parseInt(count),
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('check/filesize/:size')
  async checkFileSize(
    @Param('size') size: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.subscriptionsService.canUploadFileSize(
      req.user._id,
      parseInt(size),
    );
    return {
      success: true,
      data: result,
    };
  }
}
