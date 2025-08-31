// Core notification service for managing notifications
import { createClient } from '@supabase/supabase-js';
import type { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationMetadata,
  AdminNotificationPreference,
  AdminNotificationSettings,
  NotificationWithHistory
} from '@/types/notifications';

// Create Supabase client for server-side use
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export class NotificationService {
  private supabase = getSupabaseClient();

  /**
   * Create a new notification
   */
  async createNotification(
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    metadata: NotificationMetadata = {},
    requiresAction: boolean = false,
    actionUrl?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('create_notification', {
        p_type: type,
        p_title: title,
        p_message: message,
        p_priority: priority,
        p_metadata: metadata,
        p_requires_action: requiresAction,
        p_action_url: actionUrl
      });

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for an admin user
   */
  async getNotifications(
    adminEmail: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationWithHistory[]> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select(`
          *,
          admin_notification_history!left(
            read_at,
            dismissed_at
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      // Process notifications to add read/dismissed status
      return (notifications || []).map(notification => {
        const history = notification.admin_notification_history?.find(
          (h: any) => h.admin_email === adminEmail
        );

        return {
          ...notification,
          history,
          isRead: !!history?.read_at,
          isDismissed: !!history?.dismissed_at
        };
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count for an admin
   */
  async getUnreadCount(adminEmail: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_unread_notification_count', {
        p_admin_email: adminEmail
      });

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, adminEmail: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_admin_email: adminEmail
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for an admin
   */
  async markAllAsRead(adminEmail: string): Promise<boolean> {
    try {
      // Get all unread notifications
      const { data: notifications, error: fetchError } = await this.supabase
        .from('notifications')
        .select('id')
        .is('admin_notification_history.read_at', null);

      if (fetchError) {
        console.error('Error fetching unread notifications:', fetchError);
        return false;
      }

      // Mark each as read
      const promises = (notifications || []).map(n => 
        this.markAsRead(n.id, adminEmail)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      return false;
    }
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(notificationId: string, adminEmail: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_notification_history')
        .upsert({
          notification_id: notificationId,
          admin_email: adminEmail,
          dismissed_at: new Date().toISOString()
        }, {
          onConflict: 'notification_id,admin_email'
        });

      if (error) {
        console.error('Error dismissing notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      return false;
    }
  }

  /**
   * Get admin notification preferences
   */
  async getPreferences(adminEmail: string): Promise<AdminNotificationPreference[]> {
    try {
      const { data, error } = await this.supabase
        .from('admin_notification_preferences')
        .select('*')
        .eq('admin_email', adminEmail);

      if (error) {
        console.error('Error fetching preferences:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      return [];
    }
  }

  /**
   * Update notification preference
   */
  async updatePreference(
    adminEmail: string,
    notificationType: NotificationType,
    updates: Partial<AdminNotificationPreference>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_notification_preferences')
        .upsert({
          admin_email: adminEmail,
          notification_type: notificationType,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_email,notification_type'
        });

      if (error) {
        console.error('Error updating preference:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update preference:', error);
      return false;
    }
  }

  /**
   * Get admin notification settings
   */
  async getSettings(adminEmail: string): Promise<AdminNotificationSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_notification_settings')
        .select('*')
        .eq('admin_email', adminEmail)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return null;
    }
  }

  /**
   * Update admin notification settings
   */
  async updateSettings(
    adminEmail: string,
    updates: Partial<AdminNotificationSettings>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_notification_settings')
        .upsert({
          admin_email: adminEmail,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_email'
        });

      if (error) {
        console.error('Error updating settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_expired_notifications');

      if (error) {
        console.error('Error cleaning up notifications:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    callback: (notification: Notification) => void
  ) {
    const subscription = this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribeFromNotifications(subscription: any) {
    if (subscription) {
      this.supabase.removeChannel(subscription);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();