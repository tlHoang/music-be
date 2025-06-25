import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, isValidObjectId, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPasswordHelper } from 'src/utils/PasswordHelper';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import aqp from 'api-query-params';
import {
  CodeActivateDto,
  CreateAuthDto,
  ResendCodeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../auth/dto/create-auth.dto';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Follower } from '../followers/schemas/follower.schema';
import { Song } from '../songs/schemas/song.schema';
import { Playlist } from '../playlists/schemas/playlist.schema';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Follower.name)
    private readonly followerModel: Model<Follower>,
    @InjectModel(Song.name)
    private readonly songModel: Model<Song>,
    @InjectModel(Playlist.name)
    private readonly playlistModel: Model<Playlist>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * Generate a 6-digit activation code
   * @returns {string} 6-digit activation code
   */
  private generateActivationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async isEmailExist(email: string) {
    const user = await this.userModel.exists({ email });
    if (user) return true;
    return false;
  }

  async isUsernameExist(username: string) {
    const user = await this.userModel.exists({ username });
    if (user) return true;
    return false;
  }

  async create(createUserDto: CreateUserDto) {
    const isEmailExist = await this.isEmailExist(createUserDto.email);
    if (isEmailExist) {
      throw new BadRequestException('Email already exist');
    }
    const isUsernameExist = await this.userModel.exists({
      username: createUserDto.username,
    });
    if (isUsernameExist) {
      throw new BadRequestException('Username already exists');
    }
    const user = await this.userModel.create({
      ...createUserDto,
      status: createUserDto.status || 'ACTIVE', // Default to ACTIVE for admin-created users
      password: await hashPasswordHelper(createUserDto.password),
    });
    return {
      _id: user._id,
    };
  }

  async findAll(query: string, currentPage: number = 1, pageSize: number = 10) {
    const { filter, sort } = aqp(query);
    if (filter.currentPage) delete filter.currentPage;
    if (filter.pageSize) delete filter.pageSize;

    if (!currentPage) currentPage = 1;
    if (!pageSize) pageSize = 10;

    if (currentPage < 1 || pageSize < 1) {
      throw new BadRequestException('Invalid query params');
    }

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (currentPage - 1) * pageSize;

    const results = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(offset)
      .select('-password')
      .sort(sort as any);

    return { results, totalPages };
  }

  async findOne(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async register(registerDto: CreateAuthDto) {
    const { username, email, password } = registerDto;
    const isEmailExist = await this.isEmailExist(email);
    if (isEmailExist) {
      throw new BadRequestException('Email already exist');
    }
    // const isUsernameExist = await this.userModel.exists({
    //   username: registerDto.username,
    // });
    const isUsernameExist = await this.isUsernameExist(username);
    if (isUsernameExist) {
      throw new BadRequestException('Username already exists');
    }
    const hashedPassword = await hashPasswordHelper(password);
    const activationCode = this.generateActivationCode();
    const user = await this.userModel.create({
      username,
      email,
      password: hashedPassword,
      isActive: false,
      status: 'PENDING',
      codeId: activationCode,
      codeExpired: dayjs().add(
        // 1,
        // 'second',
        this.configService.get<number>('CODE_EXPIRED_TIME', 1),
        this.configService.get<string>(
          'CODE_EXPIRED_UNIT',
          'day',
        ) as dayjs.ManipulateType,
      ),
    });

    this.mailerService.sendMail({
      // to: email,
      // to: 'hoanghuy232003@gmail.com',
      to: 'tlhh232003@gmail.com',
      subject: 'Activate your account',
      template: 'register',
      context: {
        name: user.email,
        activationCode: user.codeId,
      },
    });

    return {
      _id: user._id,
    };
  }

  async handleActive(data: CodeActivateDto) {
    const { _id, code } = data;

    let objectId: Types.ObjectId;
    try {
      objectId = new Types.ObjectId(_id);
    } catch (error) {
      throw new BadRequestException('Invalid user ID format');
    }

    const userRecord = await this.userModel.findById(objectId);
    console.log('userRecord', userRecord);
    if (!userRecord) {
      throw new BadRequestException('Invalid user');
    }

    if (userRecord.isActive) {
      throw new BadRequestException('Account is already active');
    }

    if (userRecord.codeId !== code) {
      throw new BadRequestException('Invalid activation code');
    }

    if (dayjs().isAfter(userRecord.codeExpired)) {
      throw new BadRequestException('Activation code has expired');
    }

    userRecord.isActive = true;
    userRecord.status = 'ACTIVE';
    userRecord.set('codeId', undefined, { strict: false });
    userRecord.set('codeExpired', undefined, { strict: false });
    await userRecord.save();

    return;
  }

  async resendCode(resendCodeDto: ResendCodeDto) {
    const { _id, email } = resendCodeDto;

    let userRecord;
    let objectId: Types.ObjectId;

    if (_id) {
      try {
        objectId = new Types.ObjectId(_id);
      } catch (error) {
        throw new BadRequestException('Invalid user ID format');
      }
      userRecord = await this.userModel.findById(_id);
    } else if (email) {
      userRecord = await this.userModel.findOne({ email });
    } else {
      throw new BadRequestException('Either _id or email must be provided');
    }

    if (!userRecord) {
      throw new BadRequestException('User not found');
    }

    if (userRecord.isActive) {
      throw new BadRequestException('Account is already active');
    }

    const activationCode = this.generateActivationCode();
    userRecord.codeId = activationCode;
    userRecord.codeExpired = dayjs()
      .add(
        this.configService.get<number>('CODE_EXPIRED_TIME', 1),
        this.configService.get<string>(
          'CODE_EXPIRED_UNIT',
          'day',
        ) as dayjs.ManipulateType,
      )
      .toDate();

    await userRecord.save();

    this.mailerService.sendMail({
      // to: userRecord.email,
      to: 'tlhh232003@gmail.com',
      subject: 'Resend Activation Code',
      template: 'register',
      context: {
        name: userRecord.email,
        activationCode: userRecord.codeId,
      },
    });

    return { _id: userRecord._id, email: userRecord.email };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const userRecord = await this.userModel.findOne({ email });
    if (!userRecord) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a reset code has been sent.' };
    }

    if (!userRecord.isActive) {
      throw new BadRequestException(
        'Account is not active. Please activate your account first.',
      );
    }

    // Generate 6-digit reset code
    const resetCode = this.generateActivationCode();

    // Set reset code and expiration (15 minutes)
    userRecord.resetCode = resetCode;
    userRecord.resetCodeExpired = dayjs().add(15, 'minutes').toDate();

    await userRecord.save();

    // Send reset email
    this.mailerService.sendMail({
      // to: userRecord.email,
      to: 'tlhh232003@gmail.com',
      subject: 'Password Reset Request',
      template: 'forgot-password',
      context: {
        name: userRecord.username || userRecord.email,
        resetCode: resetCode,
      },
    });

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, resetCode, newPassword } = resetPasswordDto;

    const userRecord = await this.userModel.findOne({ email });
    if (!userRecord) {
      throw new BadRequestException('Invalid reset request');
    }

    if (!userRecord.resetCode) {
      throw new BadRequestException(
        'No reset code found. Please request a new password reset.',
      );
    }

    if (userRecord.resetCode !== resetCode) {
      throw new BadRequestException('Invalid reset code');
    }

    if (dayjs().isAfter(userRecord.resetCodeExpired)) {
      throw new BadRequestException(
        'Reset code has expired. Please request a new password reset.',
      );
    }

    // Hash the new password
    const hashedPassword = await hashPasswordHelper(newPassword);

    // Update password and clear reset code
    userRecord.password = hashedPassword;
    userRecord.set('resetCode', undefined, { strict: false });
    userRecord.set('resetCodeExpired', undefined, { strict: false });

    await userRecord.save();

    return { message: 'Password has been reset successfully' };
  }

  decodeToken(token: string) {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  async discoverUsers(currentUserId: string | null) {
    // Find users with the most followers or most tracks
    // Exclude the current user from the results
    const query = currentUserId ? { _id: { $ne: currentUserId } } : {};

    const users = await this.userModel
      .find(query)
      .select('_id name email profilePicture')
      .limit(20)
      .lean();

    // For each user, get their followers count and tracks count
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        // Get followers count - make sure we're using the correct ID field
        const followersCount = await this.followerModel.countDocuments({
          followingId: user._id.toString(),
        });

        // Get tracks count - ensure we're using the correct field name in the Song schema
        const tracksCount = await this.songModel.countDocuments({
          userId: user._id.toString(),
        });

        console.log(
          `User ${user._id}: followersCount=${followersCount}, tracksCount=${tracksCount}`,
        );

        // Check if current user is following this user
        let isFollowing = false;
        if (currentUserId) {
          const followCheck = await this.followerModel.findOne({
            followerId: currentUserId,
            followingId: user._id.toString(), // Convert to string to match the database storage format
          });
          isFollowing = !!followCheck;
          console.log(
            `User ${user._id}: isFollowing=${isFollowing}, followCheck=${!!followCheck}`,
          );
        }

        // Process signed URL for profile picture/avatar
        let profilePicture = user.profilePicture;
        if (
          profilePicture &&
          profilePicture.includes('storage.googleapis.com')
        ) {
          try {
            profilePicture =
              await this.firebaseService.getSignedUrl(profilePicture);
          } catch (error) {
            console.error(
              'Error getting signed URL for user profilePicture:',
              error,
            );
          }
        }

        return {
          ...user,
          profilePicture,
          followersCount,
          tracksCount,
          isFollowing,
        };
      }),
    );

    // Sort by followers count to show most popular first
    enhancedUsers.sort((a, b) => b.followersCount - a.followersCount);

    return enhancedUsers;
  }

  async getUserProfile(id: string, currentUserId: string | null = null) {
    const user = await this.userModel
      .findById(id)
      .select(
        '-password -codeId -codeExpired -createdAt -updatedAt -accountType -__v',
      )
      .lean();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get followers count
    const followersCount = await this.followerModel.countDocuments({
      followingId: id.toString(),
    });

    // Get following count
    const followingCount = await this.followerModel.countDocuments({
      followerId: id.toString(),
    });

    // Check if current user is following this profile
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const followCheck = await this.followerModel.findOne({
        followerId: currentUserId.toString(),
        followingId: id.toString(),
      });
      isFollowing = !!followCheck;
      console.log(
        `Profile ${id}: isFollowing=${isFollowing}, followCheck=${!!followCheck}`,
      );
    }

    // Process signed URL for profile picture
    let profilePicture = user.profilePicture;
    if (profilePicture && profilePicture.includes('storage.googleapis.com')) {
      try {
        profilePicture =
          await this.firebaseService.getSignedUrl(profilePicture);
      } catch (error) {
        console.error('Error getting signed URL for profile picture:', error);
        // Keep original URL if signing fails
      }
    }

    return {
      data: {
        ...user,
        profilePicture,
        followersCount,
        followingCount,
        isFollowing,
      },
    };
  }

  async getUserSongsAndPlaylists(userId: string) {
    return this.userModel
      .findById(userId)
      .populate('songs')
      .populate('playlists')
      .select('_id songs playlists'); // Select only songs and playlists fields
  }

  async findAllForAdmin() {
    try {
      const users = await this.userModel
        .find()
        .select('-password -codeId -codeExpired')
        .sort({ createdAt: -1 })
        .lean();

      // For each user, get additional stats like track count and playlist count
      const enhancedUsers = await Promise.all(
        users.map(async (user) => {
          // Get tracks count (convert ObjectId to string for proper comparison)
          const trackCount = await this.songModel.countDocuments({
            userId: user._id.toString(),
          });

          // Get playlists count (convert ObjectId to string for proper comparison)
          const playlistCount = await this.playlistModel.countDocuments({
            userId: user._id.toString(),
          });

          // Get followers count (convert ObjectId to string for proper comparison)
          const followerCount = await this.followerModel.countDocuments({
            followingId: user._id.toString(),
          });

          // Get following count (convert ObjectId to string for proper comparison)
          const followingCount = await this.followerModel.countDocuments({
            followerId: user._id.toString(),
          });

          return {
            ...user,
            trackCount,
            playlistCount,
            followerCount,
            followingCount,
          };
        }),
      );

      return {
        success: true,
        data: enhancedUsers,
      };
    } catch (error) {
      console.error('Error fetching all users for admin:', error);
      return {
        success: false,
        message: 'Failed to retrieve users',
        error: error.message,
      };
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid user ID');
      }

      if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
        throw new BadRequestException('Invalid status value');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, { status }, { new: true })
        .select('-password');

      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        message: 'Failed to update user status',
        error: error.message,
      };
    }
  }

  async updateRole(id: string, role: string) {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid user ID');
      }

      if (!['ADMIN', 'USER', 'MODERATOR', 'ARTIST'].includes(role)) {
        throw new BadRequestException('Invalid role value');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, { role }, { new: true })
        .select('-password');

      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return {
        success: false,
        message: 'Failed to update user role',
        error: error.message,
      };
    }
  }

  async getUserStats(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Get basic counts
      const [totalSongs, totalPlaylists, followers, following] =
        await Promise.all([
          this.songModel.countDocuments({ userId: new Types.ObjectId(userId) }),
          this.playlistModel.countDocuments({
            userId: new Types.ObjectId(userId),
          }),
          this.followerModel.countDocuments({
            followingId: new Types.ObjectId(userId),
          }),
          this.followerModel.countDocuments({
            followerId: new Types.ObjectId(userId),
          }),
        ]);

      // Get song plays and likes over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const songs = await this.songModel
        .find({ userId: new Types.ObjectId(userId) })
        .select('title playCount likeCount uploadDate visibility')
        .sort({ uploadDate: -1 });

      // Calculate total plays and likes
      const totalPlays = songs.reduce(
        (sum, song) => sum + (song.playCount || 0),
        0,
      );
      const totalLikes = songs.reduce(
        (sum, song) => sum + (song.likeCount || 0),
        0,
      );

      // Get upload activity over the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyUploads = await this.songModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            uploadDate: { $gte: twelveMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$uploadDate' },
              month: { $month: '$uploadDate' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      // Get top performing songs
      const topSongs = songs
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 5)
        .map((song) => ({
          title: song.title,
          plays: song.playCount || 0,
          likes: song.likeCount || 0,
          visibility: song.visibility,
        }));

      // Get visibility distribution
      const visibilityStats = songs.reduce(
        (acc, song) => {
          acc[song.visibility] = (acc[song.visibility] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentSongs = await this.songModel.countDocuments({
        userId: new Types.ObjectId(userId),
        uploadDate: { $gte: sevenDaysAgo },
      });

      const recentPlaylists = await this.playlistModel.countDocuments({
        userId: new Types.ObjectId(userId),
        createdAt: { $gte: sevenDaysAgo },
      });

      return {
        success: true,
        data: {
          overview: {
            totalSongs,
            totalPlaylists,
            totalPlays,
            totalLikes,
            followers,
            following,
          },
          recentActivity: {
            songsThisWeek: recentSongs,
            playlistsThisWeek: recentPlaylists,
          },
          topSongs,
          visibilityDistribution: visibilityStats,
          monthlyUploads: monthlyUploads.map((item) => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            uploads: item.count,
          })),
          engagement: {
            averagePlaysPerSong:
              totalSongs > 0 ? Math.round(totalPlays / totalSongs) : 0,
            averageLikesPerSong:
              totalSongs > 0 ? Math.round(totalLikes / totalSongs) : 0,
            totalEngagements: totalPlays + totalLikes,
          },
        },
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        success: false,
        message: 'Failed to get user stats',
        error: error.message,
      };
    }
  }
}
