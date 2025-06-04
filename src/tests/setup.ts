import { vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock Prisma
vi.mock('../utils/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    report: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
  },
  connectDb: vi.fn(),
  disconnectDb: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Socket.IO
vi.mock('../socket.js', () => ({
  io: {
    to: vi.fn(() => ({ emit: vi.fn() })),
    emit: vi.fn(),
    sockets: { sockets: new Map() },
  },
}));

// Mock services
vi.mock('../services/faceService.js', () => ({
  default: {
    loadModels: vi.fn(() => Promise.resolve()),
    extractEmbedding: vi.fn(() => Promise.resolve(new Float32Array(128))),
    compare: vi.fn(() => []),
  },
}));

vi.mock('../utils/sms.js', () => ({
  sendSms: vi.fn(() => Promise.resolve({ sid: 'test-sms-id' })),
}));
