import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class NotificationService {
  static async getUserNotifications(userId: string, tenantId?: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async markAsRead(notificationId: string, userId: string, tenantId?: string) {
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) {
      throw new AppError('Notification not found.', 404, 'NOT_FOUND');
    }

    if (notif.userId !== userId) {
      throw new AppError('Forbidden. You do not have permission to modify this notification.', 403, 'FORBIDDEN');
    }

    // Tenant isolation verification: user can only mark notifications belonging to current tenant or platform-wide
    if (tenantId && notif.tenantId && notif.tenantId !== tenantId) {
      throw new AppError('Notification belongs to another business context.', 403, 'FORBIDDEN');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  }

  static async markAllAsRead(userId: string, tenantId?: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      data: { isRead: true },
    });

    return prisma.notification.findMany({
      where: {
        userId,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getUnreadCount(userId: string, tenantId?: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
    });
    return { unreadCount: count };
  }
}
