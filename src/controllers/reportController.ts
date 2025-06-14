import { NextFunction, Response } from 'express';
import { prisma } from '../utils/db';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../types/index';
import logger from '../utils/logger';
import cloudinary from '../config/cloudinary';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';
import faceService from '../services/faceService';
import { createNotification, NotificationType } from '../services/notification';
import { ApiError } from '../middleware/errorMiddleware';

export const createReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  //TODO: User can submit one report with the same image
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
    const userReports = await prisma.report.findMany({
      where: {
        submittedById: req.user!.id,
      },
      select: {
        id: true,
        faceEmbedding: true,
        personName: true,
        imageUrl: true,
        submittedAt: true,
      },
    });

    const duplicateThreshold = 0.3;
    let isDuplicate = false;
    let duplicateReport = null;

    for (const existingReport of userReports) {
      if (
        existingReport.faceEmbedding &&
        Array.isArray(existingReport.faceEmbedding) &&
        existingReport.faceEmbedding.length === 128
      ) {
        const existingDescriptor = new Float32Array(existingReport.faceEmbedding as number[]);
        const distance = faceService.compare(descriptor, [
          {
            id: existingReport.id,
            descriptor: existingReport.faceEmbedding as number[],
          },
        ]);

        if (distance.length > 0 && distance[0].distance < duplicateThreshold) {
          isDuplicate = true;
          duplicateReport = existingReport;
          break;
        }
      }
    }

    if (isDuplicate && duplicateReport) {
      logger.warn(
        `User ${req.user!.id} attempted to submit duplicate image. Original report: ${duplicateReport.id}`,
      );
      res.status(StatusCodes.CONFLICT).json({
        status: 'error',
        message: 'You have already submitted a report with this image or a very similar image.',
        data: {
          existingReport: {
            id: duplicateReport.id,
            personName: duplicateReport.personName,
            submittedAt: duplicateReport.submittedAt,
          },
        },
      });
      return;
    }

    const embedding = Array.from(descriptor);

    // Image's public_id to be stored on Cloudinary
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
            .json({ message: 'Image upload failed', error: error });
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
              (item.faceEmbedding as number[]).length === 128,
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
            await Promise.all([
              prisma.report.update({
                where: { id: report.id },
                data: {
                  matchedWith: matchResults[0].id,
                  status: 'MATCHED',
                },
              }),
              prisma.report.update({
                where: { id: matchResults[0].id },
                data: {
                  matchedWith: report.id,
                  status: 'MATCHED',
                },
              }),
            ]);
            const best = matchResults[0];
            const matchedReport = await prisma.report.findUnique({
              where: { id: best.id },
              include: { submittedBy: { select: { id: true, email: true, name: true } } },
            });

            await Promise.all([
              // Notification for the user who just submitted the report
              createNotification({
                userId: report.submittedById,
                type: NotificationType.MATCH_FOUND,
                message: `We found a potential match  confidence for your report on ${report.personName}.`,
                metadata: {
                  reportId: report.id,
                  matchId: best.id,
                  personName: report.personName,
                  matchedPersonName: matchedReport?.personName,
                },
                sendEmail: true,
                sendSMS: true,
              }),

              // Notification for the user whose report was matched
              matchedReport
                ? createNotification({
                    userId: matchedReport.submittedById,
                    type: NotificationType.MATCH_FOUND,
                    message: `Your report for ${matchedReport.personName} has a potential match confidence).`,
                    metadata: {
                      reportId: matchedReport.id,
                      matchId: report.id,
                      personName: matchedReport.personName,
                      matchedPersonName: report.personName,
                    },
                    sendEmail: false,
                  })
                : Promise.resolve(null),
            ]);
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
      count: reports.length,
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
    const userId = req.user?.id;
    const reports = await prisma.report.findMany({
      where: { submittedById: userId },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      status: 'Success',
      message: 'User reports fetched successfully',
      timestamp: new Date().toISOString(),
      count: reports.length,
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
    logger.info('Cloudinary delete result:', result);

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

export const updateReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const reportId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existing = await prisma.report.findUnique({ where: { id: reportId } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Report not found'));
    }

    // Only the owner or admins/police can update
    if (userRole === 'USER' && existing.submittedById !== userId) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'You can only update your own reports'));
    }

    // Update fields
    const { personName, age, gender, description, location, status } = req.body;

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        personName,
        age,
        gender,
        description,
        location,
        status: userRole !== 'USER' ? status : undefined, // Only admin/police can update status
      },
    });

    res.status(StatusCodes.OK).json({
      message: 'Report updated successfully',
      report: updated,
    });
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to update report',
        true,
        (error as Error).stack,
      ),
    );
  }
};
