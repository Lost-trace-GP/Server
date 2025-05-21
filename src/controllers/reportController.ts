import { Response } from 'express';
import { prisma } from '../utils/db';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import cloudinary from '../config/cloudinary';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';
import faceService from '../services/faceService';

export const createReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      logger.warn('Report creation attempted with no image');
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'No image provided' });
      return;
    }

    // Validate required fields
    const requiredFields = ['personName', 'age', 'gender', 'description'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        logger.warn(`Report creation attempted with missing required field: ${field}`);
        res.status(StatusCodes.BAD_REQUEST).json({ message: `Missing required field: ${field}` });
        return;
      }
    }

    // Extract face embedding
    const descriptor = await faceService.extractEmbedding(file.buffer);
    if (!descriptor || descriptor.length !== 128) {
      logger.warn('No valid face detected in uploaded image');
      res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'No face detected in the uploaded image',
      });
      return;
    }
    const embedding = Array.from(descriptor);

    // Build a unique public_id
    const slug = req.body.personName.replace(/\s+/g, '-').toLowerCase();
    const publicId = `lost-trace-reports/${slug}-${uuid()}`;

    // Upload buffer via upload_stream
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: 'lost-trace-reports',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }, { quality: 'auto' }],
      },
      async (error, result) => {
        if (error || !result) {
          logger.error(`Cloudinary upload error: ${error}`);
          return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: 'Image upload failed' });
        }

        try {
          // Create the report
          const report = await prisma.report.create({
            data: {
              personName: req.body.personName,
              age: parseInt(req.body.age),
              gender: req.body.gender,
              description: req.body.description,
              faceEmbedding: embedding,
              imageUrl: result.secure_url,
              imagePublicId: result.public_id,
              submittedById: req.user!.id,
            },
          });

          // Find potential matches
          const gallery = await prisma.report.findMany({
            where: { id: { not: report.id } },
            select: {
              id: true,
              faceEmbedding: true,
              personName: true,
              age: true,
              gender: true,
              imageUrl: true,
              status: true,
              submittedAt: true,
            },
          });

          // Make sure we have valid face embeddings to compare
          const validGallery = gallery.filter(
            (item) =>
              item.faceEmbedding &&
              Array.isArray(item.faceEmbedding) &&
              item.faceEmbedding.length === 128,
          );

          const matchResults = faceService.compare(
            descriptor,
            validGallery.map((r) => ({
              id: r.id,
              descriptor: r.faceEmbedding as number[],
            })),
          );

          // Update if there's a match
          if (matchResults.length > 0) {
            logger.info(
              `Match found for report ${report.id} with report ${matchResults[0].id} (distance: ${matchResults[0].distance})`,
            );
            await prisma.report.update({
              where: { id: report.id },
              data: {
                matchedWith: matchResults[0].id,
                status: 'MATCHED',
              },
            });
          }

          // Prepare enriched matches with report details
          const enrichedMatches = matchResults.map((match) => {
            const matchedReport = validGallery.find((r) => r.id === match.id);
            return {
              id: match.id,
              distance: match.distance,
              confidence: ((1 - match.distance) * 100).toFixed(2) + '%',
              report: matchedReport
                ? {
                    personName: matchedReport.personName,
                    age: matchedReport.age,
                    gender: matchedReport.gender,
                    imageUrl: matchedReport.imageUrl,
                    status: matchedReport.status,
                    createdAt: matchedReport.submittedAt,
                  }
                : null,
            };
          });

          res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Report Created Successfully!',
            report,
            matches: enrichedMatches.length > 0 ? enrichedMatches : null,
          });
        } catch (error) {
          logger.error(`Error creating report: ${error}`);
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to create report',
          });
        }
      },
    );

    // Push the file buffer into the upload stream
    Readable.from(file.buffer).pipe(stream);
  } catch (error) {
    logger.error(`Unexpected error in createReport: ${error}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'An unexpected error occurred',
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
