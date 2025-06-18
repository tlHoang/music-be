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
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '@/modules/users/users.service';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { FirebaseService } from '@/modules/firebase/firebase.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly firebaseService: FirebaseService,
  ) {}

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

  @Get('popular')
  @Public()
  async getPopularUsers(@Req() request: Request) {
    // Alias for discoverUsers, for frontend compatibility
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

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      // Extract the authenticated user's ID from the JWT token
      const token = request.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const decoded = this.userService.decodeToken(token);
      const authenticatedUserId = decoded?.sub;

      // Check if user is updating their own profile or is an admin
      if (authenticatedUserId !== id) {
        // Check if user has admin role
        const user = await this.userService.findOne(authenticatedUserId);
        if (!user || user.role !== 'ADMIN') {
          throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
      }

      // Check if user exists
      const targetUser = await this.userService.findOne(id);
      if (!targetUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Upload to Firebase Storage
      const avatarUrl = await this.firebaseService.uploadFile(file, 'covers');

      // Update user with avatar URL
      const updatedUser = await this.userService.update(id, {
        profilePicture: avatarUrl,
      });

      return {
        statusCode: 200,
        message: 'Avatar uploaded successfully',
        data: updatedUser,
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new HttpException(
        'Failed to upload avatar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
