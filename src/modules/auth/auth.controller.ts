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
  Put,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CodeActivateDto,
  CreateAuthDto,
  ResendCodeDto,
} from './dto/create-auth.dto';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';

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

  @Post('/register')
  @Public()
  async register(@Body() registerDto: CreateAuthDto) {
    return this.authService.register(registerDto);
  }

  @Put('/verify')
  @Public()
  @ResponseMessage('Account activated successfully')
  checkCode(@Body() codeActivateDto: CodeActivateDto) {
    return this.authService.checkCode(codeActivateDto);
  }

  @Put('/resend-verify')
  @Public()
  @ResponseMessage('Verification code resent successfully')
  resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendCode(resendCodeDto);
  }

  @Get('/profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
