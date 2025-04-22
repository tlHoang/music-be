import { Types } from 'mongoose';

// Interface for user info returned in feed
export interface UserInfo {
  _id: Types.ObjectId;
  name: string;
  avatar?: string;
}

// Interface for feed items
export interface FeedItem {
  _id: Types.ObjectId;
  title: string;
  audioUrl: string;
  visibility: string;
  userId: Types.ObjectId;
  duration: number;
  uploadDate: Date;
  plays?: number;
  likes?: number;
  user: UserInfo; // The user property that will contain user details
}
