import { PrismaClient } from '../generated/prisma';
import logger from './logger';

// Create Prisma Client instance
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Define event types
type QueryEvent = {
  query: string;
  duration: number;
  params: string;
};

type MessageEvent = {
  message: string;
  target: string;
};

// Log Prisma queries in development
prisma.$on('query', (e: QueryEvent) => {
  logger.debug(`Query: ${e.query}`);
  logger.debug(`Duration: ${e.duration}ms`);
});

// Log Prisma errors
prisma.$on('error', (e: MessageEvent) => {
  logger.error(`Prisma Error: ${e.message}`);
});

// Log Prisma info
prisma.$on('info', (e: MessageEvent) => {
  logger.info(`Prisma Info: ${e.message}`);
});

// Log Prisma warnings
prisma.$on('warn', (e: MessageEvent) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

/**
 * Connect to the database
 */
export const connectDb = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    console.log(process.env.DATABASE_URL);
    process.exit(1);
  }
};

/**
 * Disconnect from the database
 */
export const disconnectDb = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
};

export { prisma };
