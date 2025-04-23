import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
// import { RolesGuard } from '@/common/guards/roles.guard';
// import { Roles } from '@/common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
// Temporarily removed access restrictions to allow everyone access
// @UseGuards(RolesGuard)
// @Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/activity')
  getActivity() {
    return this.adminService.getActivity();
  }
}
