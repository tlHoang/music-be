import { Controller, Get, Headers, Req } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { Request } from 'express';

@Controller('health-check')
export class HealthCheckController {
  
  @Public()
  @Get()
  async checkHealth(@Req() request: Request, @Headers() headers: any) {
    // Log the custom headers
    console.log('Request headers:', {
      'X-App-Version': headers['x-app-version'],
      'X-Platform': headers['x-platform'],
    });
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'API server is running correctly',
      headers: {
        'X-App-Version': headers['x-app-version'],
        'X-Platform': headers['x-platform'],
      }
    };
  }
  
  @Public()
  @Get('ping')
  async ping() {
    return { pong: true, timestamp: Date.now() };
  }
}
