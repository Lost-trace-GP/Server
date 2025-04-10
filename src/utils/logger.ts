import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// Import DailyRotateFile transport
const DailyRotateFile = require('winston-daily-rotate-file');

// Define log directories
const logDir = path.join(process.cwd(), 'logs');

// Define log formats
const formats = {
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) =>
        `${info.timestamp} ${info.level}: ${info.message}${info.splat !== undefined ? `${info.splat}` : ''}`,
    ),
  ),
  file: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json(),
  ),
};

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: formats.console,
  }),
];

// Add file transports in production or development (not in test)
if (process.env.NODE_ENV !== 'test') {
  // Daily rotate file for combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: formats.file,
    }),
  );

  // Daily rotate file for error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: formats.file,
    }),
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false,
});

export default logger;
