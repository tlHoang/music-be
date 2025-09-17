import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface User {
      _id: Types.ObjectId | string;
      email: string;
      name?: string;
      role?: string;
    }

    interface Request {
      user?: User;
    }
  }
}
