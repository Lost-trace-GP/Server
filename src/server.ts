import { configDotenv } from 'dotenv';
import app from './app';
import { connectDb, disconnectDb } from './utils/db';
import logger from './utils/logger';

configDotenv();

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    await connectDb();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Health: http://localhost:${PORT}/api/healthz`);
    });

    // Handle graceful shutdown
    const exitHandler = async () => {
      if (server) {
        logger.info('Closing server...');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    const unexpectedErrorHandler = async (error: Error) => {
      logger.error('Unexpected error:', error);
      await disconnectDb();
      process.exit(1);
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGTERM', exitHandler);
    process.on('SIGINT', exitHandler);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
