import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/activity')
  getDashboardActivity() {
    return this.adminService.getActivity();
  }

  @Get('activity')
  getActivity(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type: string,
  ) {
    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 20;
    return this.adminService.getActivityPaginated(pageInt, limitInt, type);
  }
}
