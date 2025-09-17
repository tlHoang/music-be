import { IsNotEmpty } from 'class-validator';

export class CreateFollowerDto {
  @IsNotEmpty()
  followerId: string;

  @IsNotEmpty()
  followingId: string;
}
