import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from './error.middleware';

type ValidationSchema = {
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  body?: Joi.ObjectSchema;
};

export const validate =
  (schema: ValidationSchema) => (req: Request, res: Response, next: NextFunction) => {
    const validationOptions = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true, // Remove unknown props
    };

    // Validate request parameters
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);

      if (error) {
        const message = error.details.map((detail) => detail.message).join(', ');
        return next(new ApiError(StatusCodes.BAD_REQUEST, message));
      }

      req.params = value;
    }

    // Validate query parameters
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);

      if (error) {
        const message = error.details.map((detail) => detail.message).join(', ');
        return next(new ApiError(StatusCodes.BAD_REQUEST, message));
      }

      req.query = value;
    }

    // Validate request body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);

      if (error) {
        const message = error.details.map((detail) => detail.message).join(', ');
        return next(new ApiError(StatusCodes.BAD_REQUEST, message));
      }

      req.body = value;
    }

    return next();
  };
