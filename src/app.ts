import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import authRouter from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import reportRoutes from './routes/reportsRoutes';
import { authenticateToken } from './middleware/authMiddleware';
const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRoutes);
app.use('/api/report', reportRoutes);

// API Status endpoint
app.get('/api/healthz', (_, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});
// test auth

app.get('/api/protected', authenticateToken, async (_, res) => {
  try {
    res.json({
      status: 'success',
      message: 'You are protected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
