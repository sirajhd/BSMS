import type { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/response.js';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notifications = await NotificationService.getUserNotifications(userId);
      return sendSuccess(res, 'Notifications fetched successfully.', notifications);
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const updated = await NotificationService.markAsRead(req.params.id, userId);
      return sendSuccess(res, 'Notification marked as read.', updated);
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notifications = await NotificationService.markAllAsRead(userId);
      return sendSuccess(res, 'All notifications marked as read.', notifications);
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const count = await NotificationService.getUnreadCount(userId);
      return sendSuccess(res, 'Unread count fetched.', count);
    } catch (err) {
      next(err);
    }
  }
}
