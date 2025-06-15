import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { io } from '../socket';
import { sendSms } from '../utils/sms';
import { sendMatchFoundEmail } from '../utils/email';

export enum NotificationType {
  REPORT_APPROVED = 'REPORT_APPROVED',
  REPORT_REJECTED = 'REPORT_REJECTED',
  MATCH_FOUND = 'MATCH_FOUND',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

interface NotificationMetaData {
  reportId: string;
  matchId: string;
  personName: string | null | undefined;
  matchedPersonName: string | null | undefined;
  contactNumber: string | undefined | null;
}
interface NotificationOptions {
  userId: string;
  type: NotificationType;
  message: string;
  metadata?: NotificationMetaData;
  sendEmail?: boolean;
  sendSMS?: boolean;
}

export async function createNotification({
  userId,
  type,
  message,
  metadata,
  sendEmail = true,
  sendSMS = true,
}: NotificationOptions) {
  try {
    // Validate user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!userExists) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const notification = await prisma.notification.create({
      data: {
        message,
        userId,
      },
      include: {
        user: {
          select: { email: true, name: true },
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

    io.to(userId).emit('notification', notificationPayload);

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
        await sendMatchFoundEmail(
          userExists.email,
          metadata?.personName as string,
          metadata?.matchId,
        );
        logger.info(`Email notification queued for ${notification.user.email}`);
      } catch (emailError) {
        logger.error(`Failed to send email notification: ${emailError}`);
      }
    }

    if (sendSMS && metadata?.contactNumber) {
      try {
        const smsBody =
          type === NotificationType.MATCH_FOUND
            ? ` Lost Trace Alert:\nWe found a possible match for "${metadata?.personName}". Check your dashboard now: ${process.env.FRONTEND_URL}/dashboard/reports/${metadata?.matchId}`
            : ` Lost Trace: ${message}`;

        await sendSms(metadata.contactNumber, smsBody);
        logger.info(`SMS notification queued for ${metadata.contactNumber}`);
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

    const total = stats.reduce((sum: any, stat: any) => sum + stat._count.id, 0);
    const unread = stats.find((stat: any) => !stat.isRead)?._count.id || 0;
    const read = stats.find((stat: any) => stat.isRead)?._count.id || 0;

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
