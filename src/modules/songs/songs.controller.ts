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

// (async () => {
//   // Dynamically loads the ESM module in a CommonJS project
//   const mm = await loadEsm<typeof import('music-metadata')>('music-metadata');
// })();

@Controller('songs')
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  create(@Body() createSongDto: CreateSongDto) {
    return this.songsService.create(createSongDto);
  }

  @Get()
  findAll() {
    return this.songsService.findAll();
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.songsService.findOne(id);
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
    @Req() request: Request, // Updated type from `any` to `Request`
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

    const songData = {
      ...createSongDto,
      userId: authenticatedUserId, // Use the userId from the JWT
      audioUrl: fileUrl,
      duration,
      uploadDate,
    };

    return this.songsService.create(songData);
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.songsService.remove(id);
  }
}
