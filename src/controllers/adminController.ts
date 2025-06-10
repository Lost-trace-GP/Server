import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/index';
import { prisma } from '../utils/db';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';
import { ApiError } from '../middleware/errorMiddleware';

export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.status(StatusCodes.ACCEPTED).json({
      status: 'success',
      message: 'Users Fetched successfully',
      timestamp: new Date().toISOString(),
      count: users.length,
      data: { users },
    });
  } catch (error) {
    logger.error('Error Getting All users');
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      timestamp: new Date().toISOString(),
      error,
    });
  }
};

export const deleteUserByID = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.delete({ where: { id: id } });
    if (!user) {
      res.status(500).json({
        status: 'error',
        message: 'User does not exist',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    logger.info('User deleted successfully');
    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'User deleted successfully',
      user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting user');
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user',
      timestamp: new Date().toISOString(),
      error,
    });
  }
};

export const promoteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        role: UserRole.ADMIN,
      },
    });

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: `User ${user.id} promoted to ADMIN`,
      data: {
        id: user.id,
        role: user.role,
      },
    });
  } catch (error) {
    return next(new ApiError(StatusCodes.NOT_FOUND, `User with id ${id} not found`));
  }
};

export const demoteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        role: UserRole.USER,
      },
    });

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: `User ${user.id} demoted to USER`,
      data: {
        id: user.id,
        role: user.role,
      },
    });
  } catch (error) {
    return next(new ApiError(StatusCodes.NOT_FOUND, `User with id ${id} not found`));
  }
};

//TODO: Verify facebook Reports
