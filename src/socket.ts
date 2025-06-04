import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import logger from './utils/logger';
import { prisma } from './utils/db';

let io: Server;

export function initializeSocketIO(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      // Verify JWT token from handshake
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      jwt.verify(token, process.env.JWT_SECRET || '', (err: any, decoded: any) => {
        if (err) return next(new Error('Authentication error: Invalid token'));

        // Store user data in socket object
        socket.data.user = decoded;

        // Each user joins a room with their own userId for targeted notifications
        socket.join(decoded.id);

        next();
      });
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    logger.info(`User connected: ${userId} (Socket ID: ${socket.id})`);

    // Send any pending notifications on connect
    sendPendingNotifications(userId);

    socket.on('request_notifications', async () => {
      try {
        const notifications = await prisma.notification.findMany({
          where: { userId, isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit to prevent overwhelming
        });

        socket.emit('notifications_list', notifications);
      } catch (error) {
        logger.error(`Error fetching notifications for user ${userId}: ${error}`);
        socket.emit('error', { message: 'Failed to fetch notifications' });
      }
    });
    socket.on('mark_notification_read', async (notificationId: string) => {
      try {
        await prisma.notification.updateMany({
          where: {
            id: notificationId,
            userId: userId,
          },
          data: { isRead: true },
        });

        socket.emit('notification_marked_read', { id: notificationId });
        logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      } catch (error) {
        logger.error(`Error marking notification as read: ${error}`);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}: ${error}`);
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });

  return io;
}

export async function sendPendingNotifications(userId: string) {
  try {
    const unreadNotifications = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });

    if (unreadNotifications.length > 0) {
      // Fix: Find socket by checking all connected sockets for matching user ID
      const connectedSockets = Array.from(io.sockets.sockets.values());
      const userSocket = connectedSockets.find((socket: Socket) => socket.data.user?.id === userId);

      if (userSocket) {
        userSocket.emit('pending_notifications', unreadNotifications);
        logger.info(`Sent ${unreadNotifications.length} pending notifications to user ${userId}`);
      } else {
        logger.info(`User ${userId} not connected, notifications will be sent when they connect`);
      }
    }
  } catch (error) {
    logger.error(`Error sending pending notifications: ${error}`);
  }
}

export { io };
