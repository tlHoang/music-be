import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, isValidObjectId, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPasswordHelper } from 'src/utils/PasswordHelper';
import { UpdateUserDto } from './dto/update-user.dto';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
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
      // codeExpired: dayjs().add(1, 'day'),
      codeExpired: dayjs().add(
        1,
        'second',
        // this.configService.get<number>('CODE_EXPIRED_TIME', 1),
        // this.configService.get<string>(
        //   'CODE_EXPIRED_UNIT',
        //   'day',
        // ) as dayjs.ManipulateType,
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

  async getUserProfile(id: string) {
    return this.userModel
      .findById(id)
      .select(
        '-password -codeId -codeExpired -createdAt -updatedAt -accountType -__v',
      ); // Exclude sensitive fields like password, codeId, and codeExpired
  }

  async getUserSongsAndPlaylists(userId: string) {
    return this.userModel
      .findById(userId)
      .populate('songs')
      .populate('playlists')
      .select('_id songs playlists'); // Select only songs and playlists fields
  }
}
