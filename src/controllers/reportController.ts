import { Response } from 'express';
import { prisma } from '../utils/db';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import cloudinary from '../config/cloudinary';

export const createReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { personName, age, gender, description } = req.body;

    const imageUrl = (req.file as any)?.path;

    if (!imageUrl) {
      res.status(400).json({ status: 'error', message: 'Image upload failed' });
      return;
    }
    if (!req.user?.id) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        status: 'error',
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const report = await prisma.report.create({
      data: {
        personName,
        age: parseInt(age),
        imageUrl,
        description,
        gender,
        submittedById: req.user.id,
      },
    });

    res.status(201).json({
      status: 'Success',
      message: 'Report created successfully',
      timestamp: new Date().toISOString(),
      data: { report },
    });
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to create report',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getAllReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      status: 'Success',
      message: 'Reports fetched successfully',
      timestamp: new Date().toISOString(),
      data: { reports },
    });
  } catch (error) {
    logger.error('Error Getting All reports');
    res.status(500).json({
      status: 'error',
      message: 'Error fetching reports',
      timestamp: new Date().toISOString(),
      error,
    });
  }
};

export const getReportById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      res.status(404).json({
        status: 'error',
        message: 'Report not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'Success',
      message: 'Report fetched successfully',
      timestamp: new Date().toISOString(),
      data: { report },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching report',
      timestamp: new Date().toISOString(),
      error,
    });
  }
};

export const getUserReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      where: { submittedById: req.user!.id },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      status: 'Success',
      message: 'User reports fetched successfully',
      timestamp: new Date().toISOString(),
      data: { reports },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching your reports',
      timestamp: new Date().toISOString(),
      error,
    });
  }
};

export const deleteReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = await req.params;
  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report || report.submittedById !== req.user!.id) {
      res.status(403).json({
        status: 'error',
        message: 'Not allowed to delete this report',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const parts = report.imageUrl!.split('/');
    const filename = parts.pop()!.split('.')[0];
    const folder = parts.slice(-2, -1)[0];
    const publicId = `${folder}/${filename}`;

    console.log(publicId);
    await cloudinary.uploader.destroy(publicId);

    await prisma.report.delete({
      where: {
        id: report.id,
      },
    });
    res.json({
      status: 'Success',
      message: 'Report deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting report',
      timestamp: new Date().toISOString(),
      error,
    });
  }
};
