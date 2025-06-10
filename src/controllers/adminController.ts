import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../utils/db';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
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

export const deleteUserByID = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
  } catch (error) {}
};

export const promoteUser = async (req: AuthenticatedRequest, res: Response) => {};

export const demoteUser = async (req: AuthenticatedRequest, res: Response) => {};
