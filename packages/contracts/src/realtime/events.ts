export const REALTIME_EVENTS = {
  FORCE_LOGOUT: 'force_logout',
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION: 'notification',
} as const;

export const REALTIME_AUTH_ERROR_CODE = 'REALTIME_AUTHENTICATION_FAILED';

export interface NotificationReceivedEvent {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
