import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { UploadedFiles } from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { CreateFlagReportDto } from './dto/create-flag-report.dto';
import { ReviewFlagReportDto } from './dto/review-flag-report.dto';
import { FirebaseService } from '@/modules/firebase/firebase.service';
import { Genre } from '@/modules/genres/schemas/genre.schema';
// import * as mm from 'music-metadata';
import { loadEsm } from 'load-esm';
import { IAudioMetadata } from 'music-metadata';
import * as ffmpeg from 'fluent-ffmpeg';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { SubscriptionsService } from '@/modules/subscriptions/subscriptions.service';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('songs')
@Controller('songs')
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post()
  async create(@Body() createSongDto: CreateSongDto, @Req() req) {
    const userId = req.user._id;

    // Check subscription limits
    const currentSongCount = await this.songsService.countUserSongs(userId);
    const canUpload = await this.subscriptionsService.canUploadSong(
      userId,
      currentSongCount,
    );

    if (!canUpload.canUpload) {
      return {
        success: false,
        statusCode: 403,
        message: canUpload.reason,
        error: 'Subscription Limit Exceeded',
        data: null,
      };
    }

    // Create song data with userId
    const songData = {
      ...createSongDto,
      userId: userId,
    };

    const result = await this.songsService.create(songData);
    return {
      success: true,
      statusCode: 201,
      message: 'Song created successfully',
      data: result,
    };
  }

  @Get()
  @Public()
  async findAll() {
    const songs = await this.songsService.findAll();
    // For each song, get signed cover URL if present
    const songsWithSignedCover = await Promise.all(
      songs.map(async (song) => {
        let cover = song.cover;
        if (cover && cover.includes('storage.googleapis.com')) {
          cover = await this.firebaseService.getSignedUrl(cover);
        }
        return { ...song, cover };
      }),
    );
    return songsWithSignedCover;
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findAllForAdmin() {
    return this.songsService.findAllForAdmin();
  }

  // Important: Keep specific routes before wildcard routes
  // Move the user-songs endpoint above the :id endpoint
  @Get('user-songs')
  async getUserSongs(@Req() request: Request) {
    // Extract the authenticated user's ID from the JWT token
    const userId = this.jwtService.decode(
      request.headers.authorization!.split(' ')[1],
    ).sub;

    // Fetch songs for the user
    const songs = await this.songsService.findSongsByUser(userId);
    // For each song, get signed cover URL if present
    const songsWithSignedCover = await Promise.all(
      songs.map(async (song) => {
        let cover = song.cover;
        if (cover && cover.includes('storage.googleapis.com')) {
          cover = await this.firebaseService.getSignedUrl(cover);
        }
        return { ...song, cover };
      }),
    );
    return songsWithSignedCover;
  }

  @Get('feed')
  async getFeed(@Req() request: Request) {
    const userId = this.jwtService.decode(
      request.headers.authorization!.split(' ')[1],
    ).sub;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    // Get the feed from the service
    const feed = await this.songsService.getFeed(userId);
    // For each song, get signed cover URL if present
    const feedWithSignedCover = await Promise.all(
      feed.map(async (song) => {
        // Use the correct property for cover image in FeedItem
        let coverImage =
          (song as any).coverImage ||
          (song as any).cover ||
          (song as any).thumbnail;
        if (
          coverImage &&
          typeof coverImage === 'string' &&
          coverImage.includes('storage.googleapis.com')
        ) {
          coverImage = await this.firebaseService.getSignedUrl(coverImage);
        }
        return { ...song, coverImage };
      }),
    );
    return feedWithSignedCover;
  }

  @Get('user/:userId')
  async getUserPublicSongs(
    @Param('userId') userId: string,
    @Req() request: Request,
  ) {
    // Extract the authenticated user's ID from the JWT token if available
    let currentUserId = null;
    if (request.headers.authorization) {
      const token = request.headers.authorization.split(' ')[1];
      const decoded = this.jwtService.decode(token);
      currentUserId = decoded?.sub;
    }

    return this.songsService.findPublicSongsByUser(
      userId,
      currentUserId === userId,
    );
  }

  @Public()
  @Get('search')
  async searchSongs(@Req() request: Request) {
    console.log('=== CONTROLLER SEARCH ENDPOINT HIT ===');
    console.log('Request URL:', request.url);
    console.log('Query params:', request.query);

    // Restore param-based logic: use query params for searching/filtering
    const query = request.query;
    console.log('query: ', query);
    const result = await this.songsService.advancedSearchSongs(query);

    // Process signed URLs for covers if the search was successful
    if (result.success && 'data' in result && result.data) {
      const songsWithSignedCovers = await Promise.all(
        result.data.map(async (song) => {
          let cover = song.cover;
          if (cover && cover.includes('storage.googleapis.com')) {
            try {
              cover = await this.firebaseService.getSignedUrl(cover);
            } catch (error) {
              console.error('Error getting signed URL for cover:', error);
              // Keep original URL if signing fails
            }
          }
          return { ...song, cover };
        }),
      );

      return {
        ...result,
        data: songsWithSignedCovers,
      };
    }

    return result;
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    const song = await this.songsService.findOne(id);
    if (!song) {
      return {
        success: false,
        message: 'Song not found',
        statusCode: 404,
      };
    }

    // Get signed URL for cover if present
    let cover = song.cover;
    if (cover && cover.includes('storage.googleapis.com')) {
      cover = await this.firebaseService.getSignedUrl(cover);
    }

    // Handle both Mongoose documents and plain objects
    const songData =
      typeof song.toObject === 'function' ? song.toObject() : song;

    return {
      success: true,
      data: { ...songData, cover },
      statusCode: 200,
    };
  }

  @Patch(':id/plays')
  @Public()
  async incrementPlays(@Param('id') id: string) {
    return this.songsService.incrementPlays(id);
  }

  // @Get(':id/genres')
  // findGenresBySong(@Param('id') id: string): Promise<Genre[]> {
  //   return this.songsService.findGenresBySong(id);
  // }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMusic(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    // Extract the authenticated user's ID from the JWT token
    const authenticatedUserId = this.jwtService.decode(
      request.headers.authorization!.split(' ')[1],
    ).sub;

    // Check file size limits
    const canUploadFileSize = await this.subscriptionsService.canUploadFileSize(
      authenticatedUserId,
      file.size,
    );

    if (!canUploadFileSize.canUpload) {
      throw new ForbiddenException(canUploadFileSize.reason);
    }

    const fileUrl = await this.firebaseService.uploadFile(file);
    return { url: fileUrl };
  }

  @Post('upload-with-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audio', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  async uploadMusicWithData(
    @UploadedFiles()
    files: { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @Body() createSongDto: CreateSongDto,
    @Req() request: Request,
  ) {
    // Extract the authenticated user's ID from the JWT token
    const authenticatedUserId = this.jwtService.decode(
      request.headers.authorization!.split(' ')[1],
    ).sub;

    // Check subscription limits for song count
    const currentSongCount =
      await this.songsService.countUserSongs(authenticatedUserId);
    const canUploadSong = await this.subscriptionsService.canUploadSong(
      authenticatedUserId,
      currentSongCount,
    );

    if (!canUploadSong.canUpload) {
      return {
        success: false,
        statusCode: 403,
        message: canUploadSong.reason,
        error: 'Subscription Limit Exceeded',
        data: null,
      };
    }

    // Check file size limits if audio file is present
    if (files.audio && files.audio[0]) {
      const fileSize = files.audio[0].size;
      const canUploadFileSize =
        await this.subscriptionsService.canUploadFileSize(
          authenticatedUserId,
          fileSize,
        );

      if (!canUploadFileSize.canUpload) {
        return {
          success: false,
          statusCode: 403,
          message: canUploadFileSize.reason,
          error: 'Subscription Limit Exceeded',
          data: null,
        };
      }
    }

    // Handle cover image if present
    let coverUrl: string | undefined = undefined;
    if (files.cover && files.cover[0]) {
      coverUrl = await this.firebaseService.uploadFile(
        files.cover[0],
        'covers',
      );
    }

    // Handle audio file if present
    let fileUrl: string | undefined = undefined;
    let duration = 0;
    if (files.audio && files.audio[0]) {
      fileUrl = await this.firebaseService.uploadFile(files.audio[0], 'music');
      // Extract metadata using ffmpeg
      duration = await new Promise<number>((resolve, reject) => {
        const tempFilePath = `./uploads/temp-${Date.now()}-${files.audio![0].originalname}`;
        require('fs').writeFileSync(tempFilePath, files.audio![0].buffer);
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
          require('fs').unlinkSync(tempFilePath); // Clean up temp file
          if (err) {
            console.error('Error extracting metadata:', err);
            return reject(err);
          }
          resolve(metadata.format.duration || 0);
        });
      });
    }

    const uploadDate = new Date();

    // Prepare song data including cover
    const songData = {
      ...createSongDto,
      userId: authenticatedUserId,
      audioUrl: fileUrl,
      duration,
      uploadDate,
      cover: coverUrl,
    };

    // Create the song
    const newSong = await this.songsService.create(songData);
    return newSong;
  }

  @Post('get-signed-url')
  async getSignedUrl(@Body() body: { url: string }, @Req() request: Request) {
    // Verify authorization if needed (already handled by auth guard)

    // Generate a signed URL for the file
    const signedUrl = await this.firebaseService.getSignedUrl(body.url);
    return { signedUrl };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSongDto: UpdateSongDto) {
    console.log(`Updating song ${id} with DTO:`, updateSongDto);
    const updatedSong = await this.songsService.update(id, updateSongDto);
    return {
      statusCode: 200,
      message: 'Song updated successfully',
      data: updatedSong,
    };
  }

  @Patch(':id/flag')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  flagSong(@Param('id') id: string, @Body() body: { isFlagged: boolean }) {
    return this.songsService.flagSong(id, body.isFlagged);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      // First, get the song to access its audioUrl
      const song = await this.songsService.findOne(id);

      if (!song) {
        return {
          success: false,
          message: 'Song not found',
        };
      }

      console.log('Deleting song with ID:', id);
      console.log('Audio URL to delete:', song.audioUrl);

      // Check if the URL looks valid
      if (!song.audioUrl || !song.audioUrl.startsWith('https://')) {
        console.error('Invalid audio URL format:', song.audioUrl);
        // Still delete the DB record even if URL is invalid
        await this.songsService.remove(id);
        return {
          success: true,
          message: 'Song deleted from database, but audio URL was invalid',
          fileDeleted: false,
        };
      }

      // Delete the audio file from Firebase
      const fileDeleted = await this.firebaseService.deleteFile(song.audioUrl);
      console.log('File deletion result:', fileDeleted);

      // Delete the song record from the database
      const result = await this.songsService.remove(id);

      return {
        success: true,
        message: 'Song deleted successfully',
        fileDeleted: fileDeleted,
        audioUrl: song.audioUrl, // Return the URL for debugging
      };
    } catch (error) {
      console.error('Error deleting song:', error);
      return {
        success: false,
        message: 'Failed to delete song',
        error: error.message,
      };
    }
  }

  /**
   * Get the public or signed audio URL for a song by ID
   * Example: GET /songs/:id/audio-url
   * Returns: { audioUrl: string }
   */
  @Get(':id/audio-url')
  @Public()
  async getAudioUrl(@Param('id') id: string) {
    const song = await this.songsService.findOne(id);
    if (!song) {
      return { error: 'Song not found' };
    }
    // If the audioUrl is a Firebase Storage URL, get a signed URL
    if (song.audioUrl && song.audioUrl.includes('storage.googleapis.com')) {
      const signedUrl = await this.firebaseService.getSignedUrl(song.audioUrl);
      return { audioUrl: signedUrl };
    }
    // Otherwise, return the original URL
    return { audioUrl: song.audioUrl };
  }

  // User flag reporting endpoints
  @Post(':id/report')
  async reportSong(
    @Param('id') id: string,
    @Body() createFlagReportDto: CreateFlagReportDto,
    @Req() req: any,
  ) {
    // The user is already authenticated by the global JwtAuthGuard
    // and is available in req.user
    const userId = req.user._id;

    return await this.songsService.reportSong(id, userId, createFlagReportDto);
  }

  @Get('admin/flag-reports')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getFlagReports(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    return this.songsService.getFlagReports(
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @Patch('admin/flag-reports/:reportId/review')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async reviewFlagReport(
    @Param('reportId') reportId: string,
    @Body() reviewDto: ReviewFlagReportDto,
    @Req() req: any,
  ) {
    // The admin user is already authenticated by the global JwtAuthGuard
    // and is available in req.user
    const adminId = req.user._id;

    return await this.songsService.reviewFlagReport(
      reportId,
      adminId,
      reviewDto,
    );
  }

  @Get('admin/flagged')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getFlaggedSongs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.songsService.getFlaggedSongs(parseInt(page), parseInt(limit));
  }
}
