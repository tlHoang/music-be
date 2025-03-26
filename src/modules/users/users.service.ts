import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPasswordHelper } from 'src/utils/PasswordHelper';
import { UpdateUserDto } from './dto/update-user.dto';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async isEmailExist(email: string) {
    const user = await this.userModel.exists({ email });
    if (user) return true;
    return false;
  }

  async create(createUserDto: CreateUserDto) {
    const isEmailExist = await this.isEmailExist(createUserDto.email);
    if (isEmailExist) {
      throw new BadRequestException('Email already exist');
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
}
