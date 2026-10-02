import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { notificationsApi } from '../../api/notifications.api';
import type { Notification } from '../../types';
import { Bell, CheckCheck, Calendar, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export const BarberNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <Calendar className="w-5 h-5 text-amber-500" />;
      case 'STATUS_CHANGED':
        return <Clock className="w-5 h-5 text-blue-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-amber-500" />
            <span>Station Notifications</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Chair alerts, booking updates, and shift schedule reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
          <span>Loading station notifications...</span>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif: Notification) => (
            <Card
              key={notif.id}
              className={`border transition-colors ${
                notif.isRead
                  ? 'border-neutral-800 bg-neutral-900/60'
                  : 'border-amber-600/30 bg-neutral-900/90 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-neutral-100">{notif.title}</h2>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-neutral-900" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-neutral-500 block pt-1">
                      {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-xs text-amber-500 hover:text-amber-400 font-medium shrink-0"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Station Notifications"
          description="Your station alerts are up to date."
          icon={<Bell className="w-10 h-10 stroke-1 text-neutral-500" />}
        />
      )}
    </div>
  );
};