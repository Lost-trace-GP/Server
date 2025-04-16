import { prisma } from '../utils/db';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../middleware/error.middleware';

const JSON_WEB_TOKEN_SECRET: Secret = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const signOptions = { expiresIn: JWT_EXPIRES_IN } as SignOptions;
    const token = jwt.sign({ id: user.id }, JSON_WEB_TOKEN_SECRET, signOptions);

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: 'User created successfully',
      timestamp: new Date().toISOString(),
      data: { token },
    });
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Registration error',
        true,
        error instanceof Error ? error.stack : undefined,
      ),
    );
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials'));
    }

    const signOptions = { expiresIn: JWT_EXPIRES_IN } as SignOptions;
    const token = jwt.sign({ id: user.id }, JSON_WEB_TOKEN_SECRET, signOptions);

    res.status(StatusCodes.OK).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Login error',
        true,
        error instanceof Error ? error.stack : undefined,
      ),
    );
  }
};
