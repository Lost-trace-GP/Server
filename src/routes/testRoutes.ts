import { Router } from 'express';
import { prisma } from '../utils/db';
import { io } from '../socket';

import logger from '../utils/logger';

import { AuthenticatedRequest } from '../types/index';
import { authenticateToken } from '../middleware/authMiddleware';
const router = Router();

router.use(authenticateToken);

router.get('/api/protected', async (_, res) => {
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

// Test endpoint to send a notification
router.post('/notification', async (req: AuthenticatedRequest, res) => {
  try {
    const { message } = req.body;
    const userId = req.user!.id;

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        message,
        userId,
      },
    });

    // Emit via Socket.IO
    io.to(userId).emit('notification', {
      id: notification.id,
      message: notification.message,
      createdAt: notification.createdAt,
      isRead: false,
    });

    res.status(201).json({
      status: 'success',
      message: 'Test notification sent',
      notification,
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test notification',
    });
  }
});

export default router;
