import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

// Interface for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  errors?: any[];

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    stack = '',
    code?: string,
    errors?: any[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Handle 404 (Not Found) errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(
    StatusCodes.NOT_FOUND,
    `Resource not found: Cannot ${req.method} ${req.originalUrl}`,
  );
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
  let { statusCode, message, code, errors } = err;

  // If status code is not set, default to 500
  if (!statusCode) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }

  // Normalize error code if not provided
  if (!code) {
    code = statusCode.toString();
  }

  // Create standardized response object
  const response: Record<string, any> = {
    status: 'error',
    code: statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // Add errors array if available
  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Add stack trace ONLY in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Sanitize error message for production to avoid exposing sensitive information
  if (process.env.NODE_ENV === 'production' && statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    response.message = 'Internal server error';
  }

  // Log the error with appropriate severity level
  const logData = {
    method: req.method,
    path: req.path,
    statusCode,
    message,
    userId: (req as any).user?.id || 'unauthenticated',
    ip: req.ip,
  };

  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error('API Error', { ...logData, stack: err });
  } else {
    logger.warn('API Warning', logData);
  }

  // Send the response
  res.status(statusCode).json(response);
};
