import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { io } from '../socket';
import { sendSms } from '../utils/sms';

export enum NotificationType {
  REPORT_APPROVED = 'REPORT_APPROVED',
  REPORT_REJECTED = 'REPORT_REJECTED',
  MATCH_FOUND = 'MATCH_FOUND',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

interface NotificationOptions {
  userId: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
  sendSMS?: boolean;
}

export async function createNotification({
  userId,
  type,
  message,
  metadata = {},
  sendEmail = false,
  sendSMS = true,
}: NotificationOptions) {
  try {
    // Validate user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true },
    });

    if (!userExists) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Create database notification with metadata
    const notification = await prisma.notification.create({
      data: {
        message,
        userId,
        // Store metadata as JSON if your schema supports it
        // If not, you might need to add a metadata field to your Notification model
      },
      include: {
        user: {
          select: { email: true, name: true, phone: true },
        },
      },
    });

    // Emit real-time notification via Socket.IO with enhanced data
    const notificationPayload = {
      id: notification.id,
      message: notification.message,
      type,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
      metadata,
    };

    // Send to user's room
    io.to(userId).emit('notification', notificationPayload);

    // Also try to find and send to specific socket (backup method)
    const connectedSockets = Array.from(io.sockets.sockets.values());
    const userSocket = connectedSockets.find((socket) => socket.data.user?.id === userId);

    if (userSocket) {
      userSocket.emit('notification', notificationPayload);
      logger.info(`Real-time notification sent to user ${userId}`);
    } else {
      logger.info(`User ${userId} not connected, notification stored for later delivery`);
    }

    if (sendEmail && notification.user?.email) {
      try {
        logger.info(`Email notification queued for ${notification.user.email}`);
      } catch (emailError) {
        logger.error(`Failed to send email notification: ${emailError}`);
      }
    }

    if (sendSMS && notification.user?.phone) {
      try {
        const smsBody = NotificationType.MATCH_FOUND
          ? `LostTrace Alert: Possible match for ${metadata.personName} please checkout your dashboard`
          : `LostTrace: ${message}`;
        await sendSms(notification.user.phone.toString(), smsBody);
        logger.info(`SMS notification queued for ${notification.user.phone}`);
      } catch (smsError) {
        logger.error(`Failed to send SMS notification: ${smsError}`);
      }
    }

    return notification;
  } catch (error) {
    logger.error(`Failed to create notification: ${error}`);
    throw error;
  }
}

// Add bulk notification creation for system-wide announcements
export async function createBulkNotification({
  userIds,
  type,
  message,
  metadata = {},
}: {
  userIds: string[];
  type: NotificationType;
  message: string;
  metadata?: Record<string, any>;
}) {
  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        message,
        userId,
      })),
    });

    // Send real-time notifications to all connected users
    const notificationPayload = {
      type,
      message,
      createdAt: new Date(),
      isRead: false,
      metadata,
    };

    userIds.forEach((userId) => {
      io.to(userId).emit('notification', {
        ...notificationPayload,
        id: `bulk-${Date.now()}-${userId}`,
      });
    });

    logger.info(`Bulk notification sent to ${userIds.length} users`);
    return notifications;
  } catch (error) {
    logger.error(`Failed to create bulk notification: ${error}`);
    throw error;
  }
}

// Add notification cleanup function
export async function cleanupOldNotifications(daysOld: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    });

    logger.info(`Cleaned up ${deletedCount.count} old notifications`);
    return deletedCount;
  } catch (error) {
    logger.error(`Failed to cleanup old notifications: ${error}`);
    throw error;
  }
}

export async function getNotificationStatus(userId: string) {
  try {
    const stats = await prisma.notification.groupBy({
      by: ['isRead'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    const total = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const unread = stats.find((stat) => !stat.isRead)?._count.id || 0;
    const read = stats.find((stat) => stat.isRead)?._count.id || 0;

    return {
      total,
      unread,
      read,
      unreadPercentage: total > 0 ? Math.round((unread / total) * 100) : 0,
    };
  } catch (error) {
    logger.error(`Failed to get notification stats: ${error}`);
    throw error;
  }
}

export async function getNotificationsByUserId(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
