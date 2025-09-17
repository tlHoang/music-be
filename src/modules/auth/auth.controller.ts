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
  ForgotPasswordDto,
  ResetPasswordDto,
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

  @Post('/forgot-password')
  @Public()
  @ResponseMessage('Password reset instructions sent')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Put('/reset-password')
  @Public()
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('/profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
