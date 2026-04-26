import { useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { toast } from 'sonner';

export const NotificationManager = () => {
  const { notifications, markNotificationsAsRead } = useAuthStore();

  useEffect(() => {
    // This component could listen to WebSockets or SSE for real-time notifications
    // For now, it just shows a toast when a new unread notification arrives in the store
    const unread = notifications.filter((n) => !n.read);
    
    unread.forEach((notification) => {
      toast(notification.title, {
        description: notification.body,
        action: {
          label: 'Mark read',
          onClick: () => markNotificationsAsRead(),
        },
      });
    });

  }, [notifications, markNotificationsAsRead]);

  return null; // This is a logic-only component
};
