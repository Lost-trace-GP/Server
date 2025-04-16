import jwt, { Secret } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import '../types/express';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from './error.middleware';

interface JwtPayload {
  id: string;
  [key: string]: any;
}

const JSON_WEB_TOKEN_SECRET: Secret = process.env.JWT_SECRET || '';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Access denied. No token provided.'));
  }

  jwt.verify(token, JSON_WEB_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'Invalid or expired token.'));
    }

    (req as any).user = decoded as JwtPayload;
    next();
  });
}
