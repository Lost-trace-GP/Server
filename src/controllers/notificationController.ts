// src/controllers/notificationController.ts
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../types/index';
import {
  getNotificationsByUserId,
  markNotificationAsRead as markAsRead,
  markAllNotificationsAsRead as markAllAsRead,
  getNotificationStatus,
} from '../services/notification';
import { prisma } from '../utils/db';
import logger from '../utils/logger';

export const getNotificationStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getNotificationStatus(req.user!.id);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting notification stats:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to fetch notification statistics',
    });
  }
};

export const getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await getNotificationsByUserId(req.user!.id);

    // Count unread notifications
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(StatusCodes.OK).json({
      status: 'success',
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to fetch notifications',
    });
  }
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await markAsRead(id, req.user!.id);

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to update notification',
    });
  }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await markAllAsRead(req.user!.id);

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to update notifications',
    });
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Ensure the notification belongs to the user
    await prisma.notification.deleteMany({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to delete notification',
    });
  }
};
