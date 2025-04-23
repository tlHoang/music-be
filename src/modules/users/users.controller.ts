import {
  Body,
  Query,
  Param,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  async findAll(
    @Query() query: string,
    @Query('currentPage', ParseIntPipe) currentPage: number,
    @Query('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.userService.findAll(query, currentPage, pageSize);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findAllForAdmin() {
    return this.userService.findAllForAdmin();
  }

  @Get('discover')
  @Public()
  async discoverUsers(@Req() request: Request) {
    // Extract the authenticated user's ID from the JWT token if available
    let currentUserId = null;
    if (request.headers.authorization) {
      try {
        const token = request.headers.authorization.split(' ')[1];
        const decoded = this.userService.decodeToken(token);
        currentUserId = decoded?.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    return this.userService.discoverUsers(currentUserId);
  }

  @Get(':id')
  async getUserProfile(@Param('id') id: string, @Req() request: Request) {
    // Extract the authenticated user's ID from the JWT token if available
    let currentUserId = null;
    if (request.headers.authorization) {
      try {
        const token = request.headers.authorization.split(' ')[1];
        const decoded = this.userService.decodeToken(token);
        currentUserId = decoded?.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    return this.userService.getUserProfile(id, currentUserId);
  }

  @Get(':id/songs-playlists')
  async getUserSongsAndPlaylists(@Param('id') id: string) {
    return this.userService.getUserSongsAndPlaylists(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.userService.updateStatus(id, body.status);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.userService.updateRole(id, body.role);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
