import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import { SongsService } from '../songs/songs.service';
import { PlaylistsService } from '../playlists/playlists.service';

export interface PlanLimits {
  maxSongs: number;
  maxPlaylists: number;
  maxFileSize: number; // in bytes
  features: string[];
}

// Define an interface for subscription data
interface SubscriptionData {
  userId: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  price: number;
  paymentId: string;
  paymentMethod: string;
  endDate?: Date;
  autoRenew?: boolean;
  nextBillingDate?: Date;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @Inject(forwardRef(() => SongsService))
    private readonly songsService: SongsService,
    @Inject(forwardRef(() => PlaylistsService))
    private readonly playlistsService: PlaylistsService,
  ) {}

  // Plan configurations
  private readonly planLimits: Record<SubscriptionPlan, PlanLimits> = {
    [SubscriptionPlan.FREE]: {
      maxSongs: 10,
      maxPlaylists: 5,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      features: ['10 songs', '5 playlists', '10MB file size'],
    },
    [SubscriptionPlan.PREMIUM]: {
      maxSongs: 100,
      maxPlaylists: 50,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      features: ['100 songs', '50 playlists', '50MB file size'],
    },
    [SubscriptionPlan.PREMIUM_PLUS]: {
      maxSongs: -1, // unlimited
      maxPlaylists: -1, // unlimited
      maxFileSize: 100 * 1024 * 1024, // 100MB
      features: ['Unlimited songs', 'Unlimited playlists', '100MB file size'],
    },
  };

  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.subscriptionModel
        .findOne({
          userId: new Types.ObjectId(userId),
          status: SubscriptionStatus.ACTIVE,
        })
        .sort({ createdAt: -1 })
        .exec(); // Check if subscription is expired
      if (
        subscription &&
        subscription.endDate &&
        new Date() > subscription.endDate
      ) {
        await this.expireSubscription(subscription._id as string);
        return await this.createFreeSubscription(userId);
      }

      // If no active subscription, create free subscription
      if (!subscription) {
        return await this.createFreeSubscription(userId);
      }

      return subscription;
    } catch (error) {
      this.logger.error('Error getting user subscription:', error);
      return await this.createFreeSubscription(userId);
    }
  }

  // Create a new subscription
  async createSubscription(
    userId: string,
    plan: SubscriptionPlan,
    paymentId: string,
    durationMonths: number = 1,
  ): Promise<Subscription> {
    this.logger.log(
      `[createSubscription] Called with userId:`,
      userId,
      'plan:',
      plan,
      'paymentId:',
      paymentId,
      'durationMonths:',
      durationMonths,
    );
    try {
      // Expire any existing active subscriptions
      await this.subscriptionModel.updateMany(
        {
          userId: new Types.ObjectId(userId),
          status: SubscriptionStatus.ACTIVE,
        },
        { status: SubscriptionStatus.EXPIRED },
      );

      const startDate = new Date();
      // For permanent subscriptions, do not set endDate, nextBillingDate, or autoRenew
      const prices = {
        [SubscriptionPlan.FREE]: 0,
        [SubscriptionPlan.PREMIUM]: 10000, // match frontend
        [SubscriptionPlan.PREMIUM_PLUS]: 25000, // match frontend
      };

      const subscriptionData: SubscriptionData = {
        userId: new Types.ObjectId(userId),
        plan,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        price: prices[plan] * durationMonths, // correct price calculation
        paymentId,
        paymentMethod: 'PayOS',
      };

      // Only set endDate and nextBillingDate for FREE plan (if needed)
      if (plan === SubscriptionPlan.FREE) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);
        subscriptionData.endDate = endDate;
        subscriptionData.nextBillingDate = endDate;
      }

      this.logger.log(
        `[createSubscription] Creating subscription with data:`,
        subscriptionData,
      );
      const subscription = new this.subscriptionModel(subscriptionData);
      const savedSubscription = await subscription.save();
      this.logger.log(
        `[createSubscription] Created ${plan} subscription for user ${userId}`,
      );
      return savedSubscription;
    } catch (error) {
      this.logger.error(
        '[createSubscription] Error creating subscription:',
        error,
      );
      throw error;
    }
  }

  // Create free subscription
  private async createFreeSubscription(userId: string): Promise<Subscription> {
    const existing = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
    });

    if (existing) {
      return existing;
    }

    return await this.createSubscription(
      userId,
      SubscriptionPlan.FREE,
      'free',
      0,
    );
  }

  // Get plan limits for a subscription plan
  getPlanLimits(plan: SubscriptionPlan): PlanLimits {
    return this.planLimits[plan];
  }

  // Get user's current limits
  async getUserLimits(userId: string): Promise<PlanLimits> {
    const subscription = await this.getUserSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.FREE;
    return this.getPlanLimits(plan);
  }

  // Check if user can upload more songs
  async canUploadSong(
    userId: string,
    currentSongCount: number,
  ): Promise<{ canUpload: boolean; reason?: string }> {
    const limits = await this.getUserLimits(userId);

    if (limits.maxSongs === -1) {
      return { canUpload: true };
    }

    if (currentSongCount >= limits.maxSongs) {
      return {
        canUpload: false,
        reason: `You've reached your song limit of ${limits.maxSongs}. Upgrade to Premium for more uploads.`,
      };
    }

    return { canUpload: true };
  }

  // Check if user can create more playlists
  async canCreatePlaylist(
    userId: string,
    currentPlaylistCount: number,
  ): Promise<{ canCreate: boolean; reason?: string }> {
    const limits = await this.getUserLimits(userId);

    if (limits.maxPlaylists === -1) {
      return { canCreate: true };
    }

    if (currentPlaylistCount >= limits.maxPlaylists) {
      return {
        canCreate: false,
        reason: `You've reached your playlist limit of ${limits.maxPlaylists}. Upgrade to Premium for more playlists.`,
      };
    }

    return { canCreate: true };
  }

  // Check if file size is allowed
  async canUploadFileSize(
    userId: string,
    fileSize: number,
  ): Promise<{ canUpload: boolean; reason?: string }> {
    const limits = await this.getUserLimits(userId);

    if (fileSize > limits.maxFileSize) {
      const maxSizeMB = Math.round(limits.maxFileSize / (1024 * 1024));
      const fileSizeMB = Math.round(fileSize / (1024 * 1024));
      return {
        canUpload: false,
        reason: `File size ${fileSizeMB}MB exceeds your limit of ${maxSizeMB}MB. Upgrade to Premium for larger uploads.`,
      };
    }

    return { canUpload: true };
  }

  // Expire a subscription
  async expireSubscription(subscriptionId: string): Promise<void> {
    await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
      status: SubscriptionStatus.EXPIRED,
    });
  }

  // Cancel a subscription
  async cancelSubscription(userId: string): Promise<void> {
    await this.subscriptionModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        status: SubscriptionStatus.ACTIVE,
      },
      {
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
      },
    );
  }
  // Get subscription statistics
  async getSubscriptionStats(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    const limits = await this.getUserLimits(userId);

    // Get actual current counts from the services
    const currentCounts = {
      songs: await this.songsService.countUserSongs(userId),
      playlists: await this.playlistsService.countUserPlaylists(userId),
    };

    return {
      subscription: {
        plan: subscription?.plan || SubscriptionPlan.FREE,
      },
      limits: {
        maxSongs: limits.maxSongs,
        maxPlaylists: limits.maxPlaylists,
        maxFileSize: limits.maxFileSize,
      },
      usage: {
        songs: {
          current: currentCounts.songs,
          max: limits.maxSongs,
          percentage:
            limits.maxSongs === -1
              ? 0
              : Math.round((currentCounts.songs / limits.maxSongs) * 100),
        },
        playlists: {
          current: currentCounts.playlists,
          max: limits.maxPlaylists,
          percentage:
            limits.maxPlaylists === -1
              ? 0
              : Math.round(
                  (currentCounts.playlists / limits.maxPlaylists) * 100,
                ),
        },
      },
    };
  }

  // Update subscription from payment
  async updateSubscriptionFromPayment(
    paymentId: string,
    status: 'PAID' | 'CANCELLED' | 'EXPIRED',
  ) {
    const subscription = await this.subscriptionModel.findOne({ paymentId });

    if (!subscription) {
      this.logger.error(`Subscription not found for payment ${paymentId}`);
      return;
    }

    if (status === 'PAID') {
      subscription.status = SubscriptionStatus.ACTIVE;
    } else {
      subscription.status = SubscriptionStatus.CANCELLED;
    }

    await subscription.save();
    this.logger.log(
      `Updated subscription ${String(subscription._id)} status to ${subscription.status}`,
    );
  }
}
