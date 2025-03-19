import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async register(registerDto: CreateAuthDto) {
        return this.userService.handleRegister(registerDto);
    }

    async login(loginDto: CreateAuthDto) {
        const user = await this.userService.findOne({ email: loginDto.email });
        if (!user) {
            return null;
        }
        const isPasswordMatch = await user.comparePassword(loginDto.password);
        if (!isPasswordMatch) {
            return null;
        }
        return this.jwtService.sign({ email: user.email, id: user._id });
    }
}
