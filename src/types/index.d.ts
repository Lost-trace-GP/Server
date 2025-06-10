import { Request } from 'express';

export enum UserRole {
  ADMIN = 'ADMIN',
  POLICE = 'POLICE',
  USER = 'USER',
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN' | 'USER' | 'POLICE';
  };
}
