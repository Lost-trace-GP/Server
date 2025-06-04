import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { login, register } from '../controllers/authController';
import { prisma } from '../utils/db';

vi.mock('bcrypt');
vi.mock('jsonwebtoken');
vi.mock('../utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockBcrypt = vi.mocked(bcrypt);
const mockJwt = vi.mocked(jwt);

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockPrisma: any;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
    mockPrisma = vi.mocked(prisma);
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '1234567890',
      };

      mockReq.body = userData;

      const newUser = {
        id: 'user-123',
        name: userData.name,
        email: userData.email,
        phone: parseInt(userData.phone),
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockJwt.sign.mockReturnValue('jwt-token-123' as never);

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User created successfully',
        timestamp: expect.any(String),
        data: { token: 'jwt-token-123' },
      });
    });

    it('should return error if email already exists', async () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'password123',
        phone: '1234567890',
      };

      const existingUser = {
        id: 'existing-user',
        email: 'existing@example.com',
        name: 'Existing User',
        phone: 1234567890,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Email already exists',
        }),
      );
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'john@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword',
        phone: 1234567890,
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('jwt-token-123' as never);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        timestamp: expect.any(String),
        data: {
          token: 'jwt-token-123',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      });
    });

    it('should return error for invalid credentials', async () => {
      mockReq.body = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      await login(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid credentials',
        }),
      );
    });
  });
});
