import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  createReport,
  getAllReports,
  getReportById,
  getUserReports,
  deleteReport,
} from '../controllers/reportController';
import { prisma } from '../utils/db';
import faceService from '../services/faceService';
import cloudinary from '../config/cloudinary';
import { AuthenticatedRequest } from '../types/index';
import { ReportStatus } from '../generated/prisma/index';
import { Readable } from 'stream';

interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream: Readable;
  destination: string;
  filename: string;
  path: string;
}

interface MockBody {
  personName?: string;
  age?: string;
  gender?: string;
  description?: string;
}

interface MockAuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
  file?: MockFile;
  body: MockBody;
}

// Mock dependencies
vi.mock('../utils/db.js');
vi.mock('../services/faceService.js');
vi.mock('../config/cloudinary.js');
vi.mock('../services/notification.js');

describe('reportController', () => {
  let mockReq: Partial<MockAuthenticatedRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123' },
      file: {
        fieldname: 'image',
        originalname: 'image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('fake-image-data'),
        stream: new Readable(),
        destination: '/tmp',
        filename: 'mock-filename.jpg',
        path: '/tmp/mock-filename.jpg',
      },
      body: {
        personName: 'John Doe',
        age: '30',
        gender: 'male',
        description: 'Test description',
      },
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  describe('createReport', () => {
    it('should return error if no image is provided', async () => {
      mockReq.file = undefined;

      await createReport(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'No image provided' });
    });

    it('should return error if required fields are missing', async () => {
      mockReq.body = { personName: 'John Doe' }; // Missing age, gender, description

      await createReport(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing required field: age' });
    });

    it('should return error if no face is detected', async () => {
      vi.spyOn(faceService, 'extractEmbedding').mockResolvedValue(null);

      await createReport(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No face detected in the uploaded image',
      });
    });
  });

  describe('getAllReports', () => {
    it('should fetch all reports successfully', async () => {
      const mockReports = [
        {
          id: 'report-1',
          personName: 'John Doe',
          age: 30,
          gender: 'male',
          description: 'Test',
          faceEmbedding: [],
          imageUrl: 'https://image.com/1',
          imagePublicId: 'image-1',
          submittedById: 'user-1',
          submittedAt: new Date(),
          status: ReportStatus.PENDING,
          matchedWith: null,
          location: null,
          lat: null,
          lon: null,
          submittedBy: { id: 'user-1', name: 'User One', email: 'user1@example.com' },
        },
      ];
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue(mockReports);

      await getAllReports(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.report.findMany).toHaveBeenCalledWith({
        include: { submittedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { submittedAt: 'desc' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'Success',
        message: 'Reports fetched successfully',
        timestamp: expect.any(String),
        data: { reports: mockReports },
      });
    });
  });

  describe('getReportById', () => {
    it('should fetch a report by ID successfully', async () => {
      const mockReport = {
        id: 'report-1',
        personName: 'John Doe',
        age: null,
        gender: null,
        description: 'Test description',
        faceEmbedding: null,
        imageUrl: null,
        imagePublicId: null,
        submittedById: 'user-123',
        submittedAt: new Date(),
        status: ReportStatus.PENDING,
        matchedWith: null,
        location: null,
        lat: null,
        lon: null,
      };
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(mockReport);
      mockReq.params = { id: 'report-1' };

      await getReportById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.report.findUnique).toHaveBeenCalledWith({ where: { id: 'report-1' } });
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'Success',
        message: 'Report fetched successfully',
        timestamp: expect.any(String),
        data: { report: mockReport },
      });
    });

    it('should return 404 if report is not found', async () => {
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(null);
      mockReq.params = { id: 'report-999' };

      await getReportById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Report not found',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getUserReports', () => {
    it('should fetch user reports successfully', async () => {
      const mockReports = [
        {
          id: 'report-1',
          personName: 'John Doe',
          age: null,
          gender: null,
          description: 'Test description',
          faceEmbedding: null,
          imageUrl: null,
          imagePublicId: null,
          submittedById: 'user-123',
          submittedAt: new Date(),
          status: ReportStatus.PENDING,
          matchedWith: null,
          location: null,
          lat: null,
          lon: null,
        },
      ];
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue(mockReports);

      await getUserReports(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.report.findMany).toHaveBeenCalledWith({
        where: { submittedById: 'user-123' },
        orderBy: { submittedAt: 'desc' },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'Success',
        message: 'User reports fetched successfully',
        timestamp: expect.any(String),
        data: { reports: mockReports },
      });
    });
  });

  describe('deleteReport', () => {
    it('should delete a report successfully', async () => {
      const mockReport = {
        id: 'report-1',
        submittedById: 'user-123',
        imagePublicId: 'image-1',
        personName: null,
        age: null,
        gender: null,
        description: 'Test description',
        faceEmbedding: null,
        imageUrl: null,
        submittedAt: new Date(),
        status: ReportStatus.PENDING,
        matchedWith: null,
        location: null,
        lat: null,
        lon: null,
      };
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(mockReport);
      vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      vi.spyOn(prisma.report, 'delete').mockResolvedValue(mockReport);
      mockReq.params = { id: 'report-1' };

      await deleteReport(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.report.findUnique).toHaveBeenCalledWith({ where: { id: 'report-1' } });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('image-1');
      expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: 'report-1' } });
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'Success',
        message: 'Report deleted successfully',
        timestamp: expect.any(String),
      });
    });

    it('should return 403 if user is not the owner', async () => {
      const mockReport = {
        id: 'report-1',
        submittedById: 'other-user',
        personName: null,
        age: null,
        gender: null,
        description: 'Test description',
        faceEmbedding: null,
        imageUrl: null,
        imagePublicId: null,
        submittedAt: new Date(),
        status: ReportStatus.PENDING,
        matchedWith: null,
        location: null,
        lat: null,
        lon: null,
      };
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(mockReport);
      mockReq.params = { id: 'report-1' };

      await deleteReport(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Not allowed to delete this report',
        timestamp: expect.any(String),
      });
    });
  });
});
