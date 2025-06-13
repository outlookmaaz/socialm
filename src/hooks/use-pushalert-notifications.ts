import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PushAlertService {
  subscribe: (callback: (data: any) => void) => void;
  unsubscribe: () => void;
  sendNotification: (title: string, message: string, url?: string) => void;
  isSupported: () => boolean;
  getSubscriptionId: () => string | null;
}

declare global {
  interface Window {
    PushAlert?: PushAlertService;
  }
}

export function usePushAlertNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Initialize PushAlert when available
  useEffect(() => {
    const initializePushAlert = () => {
      if (window.PushAlert && window.PushAlert.isSupported()) {
        console.log('PushAlert initialized successfully');
        setIsInitialized(true);
        
        // Get subscription ID if available
        const subId = window.PushAlert.getSubscriptionId();
        setSubscriptionId(subId);
        
        // Subscribe to notifications
        window.PushAlert.subscribe((data) => {
          console.log('PushAlert notification received:', data);
          
          // Show in-app toast notification
          toast({
            title: data.title || 'New Notification',
            description: data.message || 'You have a new notification',
            duration: 5000,
          });
        });
      }
    };

    // Check if PushAlert is already loaded
    if (window.PushAlert) {
      initializePushAlert();
    } else {
      // Wait for PushAlert to load
      const checkPushAlert = setInterval(() => {
        if (window.PushAlert) {
          initializePushAlert();
          clearInterval(checkPushAlert);
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => {
        clearInterval(checkPushAlert);
      }, 10000);
    }

    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    };

    getCurrentUser();
  }, [toast]);

  // Send notification through PushAlert
  const sendPushNotification = useCallback(async (
    title: string, 
    message: string, 
    targetUrl?: string
  ) => {
    try {
      if (!isInitialized || !window.PushAlert) {
        console.warn('PushAlert not initialized');
        return false;
      }

      // Send notification through PushAlert
      window.PushAlert.sendNotification(title, message, targetUrl);
      
      console.log('PushAlert notification sent:', { title, message, targetUrl });
      return true;
    } catch (error) {
      console.error('Error sending PushAlert notification:', error);
      return false;
    }
  }, [isInitialized]);

  // Enhanced notification service that integrates with existing Supabase notifications
  const createEnhancedNotification = useCallback(async (
    userId: string,
    type: string,
    content: string,
    referenceId?: string,
    pushTitle?: string,
    pushMessage?: string
  ) => {
    try {
      // Create notification in Supabase (existing functionality)
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

      if (error) throw error;

      // Send push notification through PushAlert if user is not current user
      if (userId !== currentUser?.id && pushTitle && pushMessage) {
        await sendPushNotification(
          pushTitle,
          pushMessage,
          `${window.location.origin}/notifications`
        );
      }

      return data;
    } catch (error) {
      console.error('Error creating enhanced notification:', error);
      return null;
    }
  }, [currentUser, sendPushNotification]);

  // Setup real-time notification listeners for automatic push notifications
  useEffect(() => {
    if (!currentUser || !isInitialized) return;

    // Listen for new messages
    const messagesChannel = supabase
      .channel(`pushalert-messages-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, async (payload) => {
        const message = payload.new;
        
        // Get sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', message.sender_id)
          .single();

        if (sender) {
          // Send push notification
          await sendPushNotification(
            `New message from ${sender.name}`,
            message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
            `${window.location.origin}/messages`
          );
        }
      })
      .subscribe();

    // Listen for friend requests
    const friendsChannel = supabase
      .channel(`pushalert-friends-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friends',
        filter: `receiver_id=eq.${currentUser.id}`
      }, async (payload) => {
        const friendship = payload.new;
        
        // Get sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', friendship.sender_id)
          .single();

        if (sender) {
          // Send push notification
          await sendPushNotification(
            'New Friend Request',
            `${sender.name} sent you a friend request`,
            `${window.location.origin}/friends`
          );
        }
      })
      .subscribe();

    // Listen for likes on user's posts
    const likesChannel = supabase
      .channel(`pushalert-likes-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'likes'
      }, async (payload) => {
        const like = payload.new;
        
        // Check if this is a like on current user's post
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', like.post_id)
          .single();

        if (post && post.user_id === currentUser.id && like.user_id !== currentUser.id) {
          // Get liker info
          const { data: liker } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', like.user_id)
            .single();

          if (liker) {
            // Send push notification
            await sendPushNotification(
              'New Like',
              `${liker.name} liked your post`,
              `${window.location.origin}/dashboard`
            );
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [currentUser, isInitialized, sendPushNotification]);

  return {
    isInitialized,
    subscriptionId,
    sendPushNotification,
    createEnhancedNotification,
    isSupported: isInitialized && window.PushAlert?.isSupported(),
  };
}