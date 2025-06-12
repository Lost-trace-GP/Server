import { NextFunction, Response } from 'express';
import { ApiError } from './errorMiddleware';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../types/index';

export const requireRole =
  (role: 'ADMIN' | 'POLICE' | 'USER') =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Not authenticated'));
    }
    if (user.role !== role) {
      return next(new ApiError(StatusCodes.FORBIDDEN, `You don't have permission`));
    }
    next();
  };
