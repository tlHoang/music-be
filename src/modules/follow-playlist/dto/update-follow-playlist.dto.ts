import { PartialType } from '@nestjs/mapped-types';
import { CreateFollowPlaylistDto } from './create-follow-playlist.dto';

export class UpdateFollowPlaylistDto extends PartialType(
  CreateFollowPlaylistDto,
) {}
