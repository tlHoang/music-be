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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
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
import { GenreSongService } from '@/modules/genre-song/genre-song.service';

@ApiTags('songs')
@Controller('songs')
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly genreSongService: GenreSongService,
  ) {}

  @Post()
  create(@Body() createSongDto: CreateSongDto) {
    return this.songsService.create(createSongDto);
  }

  @Get()
  findAll() {
    return this.songsService.findAll();
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllForAdmin() {
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
    return this.songsService.findSongsByUser(userId);
  }

  @Get('feed')
  async getFeed(@Req() request: Request) {
    // const userId = request.user?._id;
    const userId = this.jwtService.decode(
      request.headers.authorization!.split(' ')[1],
    ).sub;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.songsService.getFeed(userId);
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

  @Get('search')
  async searchSongs(@Req() request: Request) {
    // Get the query parameter
    const query = request.query.query as string;
    console.log('Search query:', query);

    // Call the service method
    return this.songsService.searchSongs(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.songsService.findOne(id);
  }

  @Patch(':id/plays')
  async incrementPlays(@Param('id') id: string) {
    return this.songsService.incrementPlays(id);
  }

  // @Get(':id/genres')
  // findGenresBySong(@Param('id') id: string): Promise<Genre[]> {
  //   return this.songsService.findGenresBySong(id);
  // }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMusic(@UploadedFile() file: Express.Multer.File) {
    const fileUrl = await this.firebaseService.uploadFile(file);
    return { url: fileUrl };
  }

  @Post('upload-with-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMusicWithData(
    @UploadedFile() file: Express.Multer.File,
    @Body() createSongDto: CreateSongDto,
    @Req() request: Request,
  ) {
    // Extract the authenticated user's ID from the JWT token
    const authenticatedUserId = this.jwtService.decode(
      request.headers.authorization!.split(' ')[1],
    ).sub;

    const fileUrl = await this.firebaseService.uploadFile(file);

    // Extract metadata using ffmpeg
    const duration = await new Promise<number>((resolve, reject) => {
      const tempFilePath = `./uploads/temp-${Date.now()}-${file.originalname}`;
      require('fs').writeFileSync(tempFilePath, file.buffer);

      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        require('fs').unlinkSync(tempFilePath); // Clean up temp file
        if (err) {
          console.error('Error extracting metadata:', err);
          return reject(err);
        }
        resolve(metadata.format.duration || 0);
      });
    });

    const uploadDate = new Date();

    // With our DTO transformation, genres should already be properly formatted
    console.log('Genres to store:', createSongDto.genres);

    // Prepare song data including genres
    const songData = {
      ...createSongDto,
      userId: authenticatedUserId,
      audioUrl: fileUrl,
      duration,
      uploadDate,
    };

    // Create the song with genres embedded
    const newSong = await this.songsService.create(songData);
    console.log('Created new song with genres:', newSong._id);

    // Return the song with the embedded genres
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
  update(@Param('id') id: string, @Body() updateSongDto: UpdateSongDto) {
    return this.songsService.update(id, updateSongDto);
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
}
