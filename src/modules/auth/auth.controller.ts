import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@/common/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @UseGuards(LocalAuthGuard)
  @ApiBody({
    type: CreateAuthDto,
  })
  @Public()
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('/profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
