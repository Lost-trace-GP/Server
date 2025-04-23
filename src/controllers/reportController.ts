import { Response } from 'express';
import { prisma } from '../utils/db';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import cloudinary from '../config/cloudinary';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';

export const createReport = async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No image provided' });

  // Build a unique public_id
  const slug = req.body.personName.replace(/\s+/g, '-').toLowerCase();
  const publicId = `lost-trace-reports/${slug}-${uuid()}`;

  // Upload buffer via upload_stream
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'lost-trace-reports',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [{ width: 500, height: 500, crop: 'limit' }, { quality: 'auto' }],
    },
    async (error, result) => {
      if (error || !result) {
        console.error('Cloudinary upload error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Upload failed' });
      }
      const report = await prisma.report.create({
        data: {
          personName: req.body.personName,
          age: parseInt(req.body.age),
          gender: req.body.gender,
          description: req.body.description,
          imageUrl: result.secure_url,
          imagePublicId: result.public_id,
          submittedById: req.user!.id,
        },
      });
      res
        .status(StatusCodes.CREATED)
        .json({ status: 'success', message: 'Report Created Successfully!', report });
    },
  );

  // Push the file buffer into the upload stream
  Readable.from(file.buffer).pipe(stream);
};

export const getAllReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.status(StatusCodes.OK).json({
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
  const { id } = req.params;
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
    const result = await cloudinary.uploader.destroy(report.imagePublicId!);
    console.log('Cloudinary delete result:', result);

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
