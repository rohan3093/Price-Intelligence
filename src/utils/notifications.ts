/**
 * Browser Notifications Service
 * Handles browser notification permissions and scheduling
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // Used to replace existing notifications with the same tag
  data?: any;
}

/**
 * Check if browser notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

/**
 * Check current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Show a browser notification
 */
export const showNotification = (options: NotificationOptions): Notification | null => {
  if (!isNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag,
      data: options.data,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

/**
 * Schedule a notification for a specific time
 * Note: Browser notifications are best-effort and may not fire if tab is closed
 * For reliable scheduling, consider using a service worker
 */
export const scheduleNotification = (
  scheduledTime: Date,
  options: NotificationOptions
): number | null => {
  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Time has passed, show immediately
    return null;
  }

  const timeoutId = setTimeout(() => {
    showNotification(options);
  }, delay);

  return timeoutId as unknown as number;
};

/**
 * Cancel a scheduled notification
 */
export const cancelScheduledNotification = (timeoutId: number): void => {
  clearTimeout(timeoutId);
};

/**
 * Show a drop reminder notification
 */
export const showDropReminder = (dropName: string, releaseDate: Date): void => {
  const timeUntil = releaseDate.getTime() - Date.now();
  const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

  let timeText = '';
  if (hoursUntil > 0) {
    timeText = `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
  } else {
    timeText = `${minutesUntil} minute${minutesUntil > 1 ? 's' : ''}`;
  }

  showNotification({
    title: 'Drop Reminder',
    body: `${dropName} drops in ${timeText}!`,
    tag: `drop-reminder-${dropName}`,
    icon: '/favicon.ico',
  });
};

