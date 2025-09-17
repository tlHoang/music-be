import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { ReorderSongsDto } from './dto/reorder-songs.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { isValidObjectId } from 'mongoose';
import { FirebaseService } from '@/modules/firebase/firebase.service';
import { SubscriptionsService } from '@/modules/subscriptions/subscriptions.service';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistsController {
  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}
  @Post()
  async create(@Body() createPlaylistDto: CreatePlaylistDto, @Request() req) {
    const userId = req.user._id;

    // Check subscription limits
    const currentPlaylistCount =
      await this.playlistsService.countUserPlaylists(userId);
    const canCreate = await this.subscriptionsService.canCreatePlaylist(
      userId,
      currentPlaylistCount,
    );

    if (!canCreate.canCreate) {
      return {
        success: false,
        statusCode: 403,
        message: canCreate.reason,
        error: 'Subscription Limit Exceeded',
        data: null,
      };
    }

    // Ensure the userId in the DTO matches the authenticated user
    createPlaylistDto.userId = userId;
    const result = await this.playlistsService.create(createPlaylistDto);
    return {
      success: true,
      statusCode: 201,
      message: 'Playlist created successfully',
      data: result,
    };
  }
  @Public()
  @Get()
  findAll(
    @Query('visibility') visibility?: string,
    @Query('limit') limit?: string,
  ) {
    return this.playlistsService.findAll(
      visibility,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Public()
  @Get('featured')
  getFeaturedPlaylists() {
    return this.playlistsService.getFeaturedPlaylists();
  }
  @Public()
  @Get('system-check')
  async systemCheck() {
    try {
      const result = await this.playlistsService.findAll();
      const playlistCount = result.data ? result.data.length : 0;

      return {
        success: true,
        message: 'System check successful',
        data: {
          playlistCount,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('System check failed:', error);
      return {
        success: false,
        message: 'System check failed',
        error: error.message,
      };
    }
  }

  @Get('user')
  findUserPlaylists(@Request() req) {
    console.log('findUserPlaylists endpoint called');
    console.log('Request user:', req.user);
    console.log('User ID from request:', req.user._id);
    return this.playlistsService.findUserPlaylists(req.user._id);
  }

  @Public()
  @Get('user/:userId')
  findPlaylistsByUserId(
    @Param('userId') userId: string,
    @Query('visibility') visibility?: string,
    @Request() req?,
  ) {
    // const currentUserId = this.jwtService.decode(
    //   req.headers.authorization!.split(' ')[1],
    // ).sub;
    // Check if the request is authenticated
    if (req && req.user) {
      // User is authenticated, use their ID
      const currentUserId = req.user._id;
      console.log('Authenticated user:', currentUserId);
      console.log('Auth debug:', userId, visibility, currentUserId);

      return this.playlistsService.findPlaylistsByUserId(
        userId,
        visibility,
        currentUserId,
      );
    } else {
      // No authenticated user, only return public playlists
      console.log('Public debug:', userId, visibility, 'unauthenticated');

      return this.playlistsService.findPlaylistsByUserId(
        userId,
        'PUBLIC', // Force public visibility for unauthenticated requests
        null, // No current user ID
      );
    }
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  findAllForAdmin() {
    return this.playlistsService.findAllForAdmin();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playlistsService.getPlaylistDetails(id);
  }

  @Public()
  @Get(':id/debug')
  async debugPlaylist(@Param('id') id: string) {
    try {
      if (!isValidObjectId(id)) {
        return {
          success: false,
          message: 'Invalid playlist ID format',
        };
      }

      // Get the raw playlist without population
      const rawPlaylist = await this.playlistsService.findOne(id);

      if (!rawPlaylist) {
        return {
          success: false,
          message: 'Playlist not found',
        };
      }

      // Get the playlist with populated songs
      const playlist = await this.playlistsService.getPlaylistDetails(id);

      // Calculate statistics about the songs
      const songCount = rawPlaylist.songs?.length || 0;
      const validSongIds =
        rawPlaylist.songs?.filter((id) => isValidObjectId(id)).length || 0;
      const invalidSongIds = songCount - validSongIds;

      // Get first few songs for inspection
      const sampleSongIds = (rawPlaylist.songs || []).slice(0, 3).map((id) => ({
        id: id.toString(),
        isValidObjectId: isValidObjectId(id),
        type: typeof id,
      }));

      return {
        success: true,
        data: {
          playlistId: id,
          songStats: {
            total: songCount,
            validIds: validSongIds,
            invalidIds: invalidSongIds,
          },
          sampleSongIds,
          rawPlaylist: {
            _id: rawPlaylist._id,
            name: rawPlaylist.name,
            userId: rawPlaylist.userId,
            songsCount: rawPlaylist.songs?.length,
          },
          populatedPlaylist: playlist.data,
        },
      };
    } catch (error) {
      console.error('Error debugging playlist:', error);
      return {
        success: false,
        message: 'Failed to debug playlist',
        error: error.message,
      };
    }
  }

  @Public()
  @Get(':id/fix-songs')
  async fixPlaylistSongs(@Param('id') id: string) {
    try {
      if (!isValidObjectId(id)) {
        return {
          success: false,
          message: 'Invalid playlist ID format',
        };
      }

      // Get the raw playlist without population
      const rawPlaylist = await this.playlistsService.findOne(id);

      if (!rawPlaylist) {
        return {
          success: false,
          message: 'Playlist not found',
        };
      }

      // Get only valid ObjectId songs
      const validSongs = (rawPlaylist.songs || []).filter(
        (songId) => songId && isValidObjectId(songId.toString()),
      );

      // Count removed songs
      const removedCount = (rawPlaylist.songs?.length || 0) - validSongs.length;

      // Update the playlist with only valid song IDs
      if (removedCount > 0) {
        rawPlaylist.songs = validSongs;
        await rawPlaylist.save();
      }

      return {
        success: true,
        message: `Playlist songs fixed successfully. Removed ${removedCount} invalid references.`,
        data: {
          playlistId: id,
          originalCount: rawPlaylist.songs?.length || 0,
          newCount: validSongs.length,
          removedCount,
        },
      };
    } catch (error) {
      console.error('Error fixing playlist songs:', error);
      return {
        success: false,
        message: 'Failed to fix playlist songs',
        error: error.message,
      };
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
    @Request() req,
  ) {
    // Ensure the user can only update their own playlists
    return this.playlistsService.update(id, updatePlaylistDto);
  }
  @Patch(':id/reorder')
  async reorderSongs(
    @Param('id') playlistId: string,
    @Body() reorderSongsDto: ReorderSongsDto,
    @Request() req,
  ) {
    console.log('Reorder request received for playlist:', playlistId);

    // Extract userId directly from JWT token in Authorization header
    let userId;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decodedToken = this.jwtService.decode(token);

        if (decodedToken && decodedToken.sub) {
          userId = decodedToken.sub;
          console.log('User ID extracted from token:', userId);
        } else {
          throw new Error('Invalid token format');
        }
      } else {
        throw new Error('No authorization header found');
      }
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      throw new HttpException(
        {
          statusCode: 401,
          message: 'Authentication required',
          data: {
            success: false,
            message: 'Valid authentication token required',
          },
        },
        401,
      );
    }

    const result = await this.playlistsService.reorderSongs(
      playlistId,
      userId,
      reorderSongsDto,
    );

    // If the service returns a statusCode, throw an appropriate HttpException
    if (result.statusCode && !result.success) {
      throw new HttpException(
        {
          statusCode: result.statusCode,
          message: result.message || '',
          data: {
            success: result.success,
            message: result.message,
          },
        },
        result.statusCode,
      );
    }

    return result;
  }

  @Post(':id/songs/:songId')
  async addSongToPlaylist(
    @Param('id') playlistId: string,
    @Param('songId') songId: string,
    @Request() req,
  ) {
    const result = await this.playlistsService.addSongToPlaylist(
      playlistId,
      songId,
      req.user._id,
    );

    // If the service returns a statusCode, throw an appropriate HttpException
    if (result.statusCode && !result.success) {
      throw new HttpException(
        {
          statusCode: result.statusCode,
          message: result.message || '',
          data: {
            success: result.success,
            message: result.message,
          },
        },
        result.statusCode,
      );
    }

    return result;
  }

  @Delete(':id/songs/:songId')
  async removeSongFromPlaylist(
    @Param('id') playlistId: string,
    @Param('songId') songId: string,
    @Request() req,
  ) {
    const result = await this.playlistsService.removeSongFromPlaylist(
      playlistId,
      songId,
      req.user._id,
    );

    // If the service returns a statusCode, throw an appropriate HttpException
    if (result.statusCode && !result.success) {
      throw new HttpException(
        {
          statusCode: result.statusCode,
          message: result.message || '',
          data: {
            success: result.success,
            message: result.message,
          },
        },
        result.statusCode,
      );
    }

    return result;
  }
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/featured')
  setFeatured(@Param('id') id: string, @Body() body: { isFeatured: boolean }) {
    return this.playlistsService.setFeatured(id, body.isFeatured);
  }

  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('cover'))
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      // Check if user owns the playlist
      const playlist = await this.playlistsService.findOne(id);
      if (!playlist) {
        throw new HttpException('Playlist not found', HttpStatus.NOT_FOUND);
      }

      if (playlist.userId.toString() !== req.user._id) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      } // Upload to Firebase Storage
      const coverUrl = await this.firebaseService.uploadFile(file, 'covers');

      // Update playlist with cover URL
      const updatedPlaylist = await this.playlistsService.update(id, {
        cover: coverUrl,
      });

      return {
        statusCode: 200,
        message: 'Cover uploaded successfully',
        data: updatedPlaylist,
      };
    } catch (error) {
      console.error('Error uploading playlist cover:', error);
      throw new HttpException(
        'Failed to upload cover',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    // TODO: Add check to ensure users can only delete their own playlists
    return this.playlistsService.remove(id);
  }
}
