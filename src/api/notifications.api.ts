import { apiClient } from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  getNotifications: () =>
    apiClient<Notification[]>('/notifications'),

  getUnreadCount: () =>
    apiClient<{ unreadCount: number }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiClient<Notification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    apiClient<Notification[]>('/notifications/read-all', {
      method: 'PATCH',
    }),
};
