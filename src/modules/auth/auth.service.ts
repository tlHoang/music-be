import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { comparePasswordHelper } from '@/utils/PasswordHelper';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/schemas/user.schema';
import {
  CodeActivateDto,
  CreateAuthDto,
  ResendCodeDto,
} from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await comparePasswordHelper(pass, user.password))) {
      return null;
    }
    return user;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role, // Include user role in the JWT payload
      username: user.username, // Also include username
    };
    return {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role, // Return the role to the frontend
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(registerDto: CreateAuthDto) {
    return this.usersService.register(registerDto);
  }

  checkCode(codeActivateDto: CodeActivateDto) {
    return this.usersService.handleActive(codeActivateDto);
  }

  resendCode(resendCodeDto: ResendCodeDto) {
    return this.usersService.resendCode(resendCodeDto);
  }
}
