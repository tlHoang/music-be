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
} from '../auth/dto/create-auth.dto';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Follower } from '../followers/schemas/follower.schema';
import { Song } from '../songs/schemas/song.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Follower.name)
    private readonly followerModel: Model<Follower>,
    @InjectModel(Song.name)
    private readonly songModel: Model<Song>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

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
    const user = await this.userModel.create({
      username,
      email,
      password: hashedPassword,
      isActive: false,
      codeId: uuidv4(),
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

    userRecord.codeId = uuidv4();
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
      to: userRecord.email,
      subject: 'Resend Activation Code',
      template: 'register',
      context: {
        name: userRecord.email,
        activationCode: userRecord.codeId,
      },
    });

    return { _id: userRecord._id, email: userRecord.email };
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
      .select('_id name email avatar')
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

        return {
          ...user,
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

    return {
      data: {
        ...user,
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
          // Get tracks count
          const trackCount = await this.songModel.countDocuments({
            userId: user._id,
          });

          // Get playlists count - use aggregation to get playlists count if you have a playlist model
          // As a placeholder, I'll set it to 0 since we don't have direct access to the playlist model here
          const playlistCount = 0; // Replace with actual count when possible

          // Get followers count
          const followerCount = await this.followerModel.countDocuments({
            followingId: user._id,
          });

          // Get following count
          const followingCount = await this.followerModel.countDocuments({
            followerId: user._id,
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
}
