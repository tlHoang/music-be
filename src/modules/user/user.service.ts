import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPasswordHelper } from 'src/utils/PasswordHelper';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        const createdUser = new this.userModel(createUserDto);
        return createdUser.save();
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find().exec();
    }

    async findOne(id: string): Promise<User | null> {
        return this.userModel.findById(id).exec();
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
        return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
    }

    async remove(id: string): Promise<User | null> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async handleRegister(registerDto: CreateAuthDto): Promise<User> {
        const isEmailExist = await this.userModel.findOne({ email: registerDto.email });
        if (isEmailExist) {
            throw new BadRequestException('Email đã tồn tại');
        }
        const hashedPassword = await hashPasswordHelper(registerDto.password);
        return this.userModel.create({ ...registerDto, password: hashedPassword });
    }
}
