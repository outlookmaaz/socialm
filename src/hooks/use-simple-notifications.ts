import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  content: string;
  reference_id?: string;
  read: boolean;
  created_at: string;
  user_id: string;
}

export function useSimpleNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        // If table doesn't exist, create some sample notifications
        if (error.code === '42P01') {
          console.log('Notifications table does not exist yet');
          setNotifications([]);
          setUnreadCount(0);
        }
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Create notification
  const createNotification = useCallback(async (
    userId: string, 
    type: string, 
    content: string, 
    referenceId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          content,
          reference_id: referenceId,
          read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        // Revert optimistic update
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
        );
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Optimistic update
      const originalNotifications = [...notifications];
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        // Revert on error
        setNotifications(originalNotifications);
        setUnreadCount(originalNotifications.filter(n => !n.read).length);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to mark all notifications as read'
        });
      } else {
        toast({
          title: 'All notifications marked as read',
          description: 'Your notifications have been updated',
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [currentUser, notifications, toast]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      const originalNotifications = [...notifications];
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        // Revert on error
        setNotifications(originalNotifications);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete notification'
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications, toast]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Optimistic update
      const originalNotifications = [...notifications];
      setNotifications([]);
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .is('deleted_at', null);

      if (error) {
        console.error('Error clearing notifications:', error);
        // Revert on error
        setNotifications(originalNotifications);
        setUnreadCount(originalNotifications.filter(n => !n.read).length);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to clear notifications'
        });
      } else {
        toast({
          title: 'All notifications cleared',
          description: 'Your notifications have been cleared',
        });
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [currentUser, notifications, toast]);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Your browser does not support notifications'
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive real-time notifications'
        });

        // Send test notification
        new Notification('Notifications Enabled!', {
          body: 'You will now receive real-time notifications',
          icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png'
        });
      }
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [toast]);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
        tag: 'socialchat-notification'
      });
    }
  }, []);

  // Fetch notifications when user changes
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser, fetchNotifications]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        }, 
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to state
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show browser notification
          sendBrowserNotification(
            getNotificationTitle(newNotification.type),
            newNotification.content
          );

          // Show toast
          toast({
            title: getNotificationTitle(newNotification.type),
            description: newNotification.content,
            duration: 4000
          });
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        }, 
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [currentUser, sendBrowserNotification, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestPermission,
    createNotification,
    fetchNotifications
  };
}

// Helper function to get notification titles
function getNotificationTitle(type: string): string {
  switch (type) {
    case 'message':
      return 'New Message';
    case 'friend_request':
      return 'Friend Request';
    case 'friend_accepted':
      return 'Friend Request Accepted';
    case 'friend_rejected':
      return 'Friend Request Rejected';
    case 'like':
      return 'New Like';
    case 'comment':
      return 'New Comment';
    default:
      return 'Notification';
  }
}