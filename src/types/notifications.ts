// Notification system types and interfaces

export type NotificationType = 
  | 'new_booking'
  | 'walk_in'
  | 'payment_received'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'double_booking_attempt'
  | 'staff_unavailable'
  | 'room_conflict'
  | 'system_alert';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface NotificationMetadata {
  bookingId?: string;
  customerId?: string;
  customerName?: string;
  serviceName?: string;
  serviceId?: string;
  staffId?: string;
  staffName?: string;
  roomId?: string;
  bookingDate?: string;
  startTime?: string;
  walkinId?: string;
  cancellationReason?: string;
  conflictDetails?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  metadata: NotificationMetadata;
  requiresAction: boolean;
  actionUrl?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationHistory {
  id: string;
  notificationId: string;
  adminEmail: string;
  readAt?: string;
  dismissedAt?: string;
  createdAt: string;
}

export interface AdminNotificationPreference {
  id: string;
  adminEmail: string;
  notificationType: NotificationType;
  enabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationSettings {
  id: string;
  adminEmail: string;
  soundVolume: number; // 0-100
  doNotDisturbEnabled: boolean;
  doNotDisturbStart?: string; // Time string HH:MM
  doNotDisturbEnd?: string; // Time string HH:MM
  browserPermissionGranted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationWithHistory extends Notification {
  history?: AdminNotificationHistory;
  isRead: boolean;
  isDismissed: boolean;
}

// Notification configuration
export const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: string;
  color: string;
  defaultPriority: NotificationPriority;
  soundFile?: string;
  label?: string;
  description?: string;
}> = {
  new_booking: {
    icon: '📅',
    color: 'blue',
    defaultPriority: 'normal',
    soundFile: 'notification.mp3',
    label: 'New Bookings',
    description: 'Notifications for new customer bookings'
  },
  walk_in: {
    icon: '🚶',
    color: 'green',
    defaultPriority: 'high',
    soundFile: 'notification.mp3',
    label: 'Walk-ins',
    description: 'Alerts when walk-in customers arrive'
  },
  payment_received: {
    icon: '💰',
    color: 'green',
    defaultPriority: 'normal',
    soundFile: 'success.mp3',
    label: 'Payments',
    description: 'Payment confirmation notifications'
  },
  booking_cancelled: {
    icon: '❌',
    color: 'red',
    defaultPriority: 'normal',
    soundFile: 'notification.mp3',
    label: 'Cancellations',
    description: 'Booking cancellation alerts'
  },
  booking_rescheduled: {
    icon: '🔄',
    color: 'yellow',
    defaultPriority: 'normal',
    soundFile: 'notification.mp3',
    label: 'Reschedules',
    description: 'Booking rescheduling notifications'
  },
  double_booking_attempt: {
    icon: '⚠️',
    color: 'red',
    defaultPriority: 'urgent',
    soundFile: 'urgent.mp3',
    label: 'Double Bookings',
    description: 'Alerts for double booking attempts'
  },
  staff_unavailable: {
    icon: '👤',
    color: 'orange',
    defaultPriority: 'high',
    soundFile: 'notification.mp3',
    label: 'Staff Issues',
    description: 'Staff availability problems'
  },
  room_conflict: {
    icon: '🏠',
    color: 'orange',
    defaultPriority: 'high',
    soundFile: 'urgent.mp3',
    label: 'Room Conflicts',
    description: 'Room scheduling conflicts'
  },
  system_alert: {
    icon: '🔔',
    color: 'purple',
    defaultPriority: 'normal',
    soundFile: 'notification.mp3',
    label: 'System Alerts',
    description: 'General system notifications'
  }
};

// Priority configuration
export const PRIORITY_CONFIG: Record<NotificationPriority, {
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  toastDuration: number; // milliseconds
}> = {
  urgent: {
    badge: '🔴 Urgent',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    toastDuration: 10000
  },
  high: {
    badge: '🟠 High',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    toastDuration: 8000
  },
  normal: {
    badge: '🔵 Normal',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    toastDuration: 6000
  },
  low: {
    badge: '⚪ Low',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    toastDuration: 4000
  }
};

// Helper functions
export function getNotificationIcon(type: NotificationType): string {
  return NOTIFICATION_CONFIG[type]?.icon || '🔔';
}

export function getNotificationColor(type: NotificationType): string {
  return NOTIFICATION_CONFIG[type]?.color || 'gray';
}

export function getPriorityConfig(priority: NotificationPriority) {
  return PRIORITY_CONFIG[priority];
}

export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function isInDoNotDisturb(settings: AdminNotificationSettings): boolean {
  if (!settings.doNotDisturbEnabled) return false;
  if (!settings.doNotDisturbStart || !settings.doNotDisturbEnd) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Handle DND that spans midnight
  if (settings.doNotDisturbEnd < settings.doNotDisturbStart) {
    return currentTime >= settings.doNotDisturbStart || currentTime <= settings.doNotDisturbEnd;
  }
  
  return currentTime >= settings.doNotDisturbStart && currentTime <= settings.doNotDisturbEnd;
}