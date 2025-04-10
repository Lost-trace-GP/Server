import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

// Interface for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Handle 404 (Not Found) errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(StatusCodes.NOT_FOUND, `Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

// Central error handler
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  // Set defaults
  let { statusCode, message } = err;
  const response: Record<string, any> = {
    status: 'error',
    message,
  };

  // If status code is not set, default to 500
  if (!statusCode) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Log the error
  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${message}`);
    logger.error(err.stack || 'No stack trace available');
  } else {
    logger.warn(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${message}`);
  }

  res.status(statusCode).json(response);
};
