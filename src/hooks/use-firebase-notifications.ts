import { useEffect, useState, useCallback } from 'react';
import { NotificationService, requestNotificationPermission } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

interface FirebaseNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
  isInitialized: boolean;
}

export function useFirebaseNotifications() {
  const [state, setState] = useState<FirebaseNotificationState>({
    isSupported: false,
    permission: 'default',
    token: null,
    isInitialized: false
  });
  const { toast } = useToast();

  // Initialize Firebase notifications
  const initialize = useCallback(async () => {
    try {
      const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isInitialized: true }));
        return;
      }

      const permission = Notification.permission;
      const token = localStorage.getItem('fcm_token');
      
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission,
        token,
        isInitialized: true
      }));

      // Initialize Firebase messaging
      await NotificationService.initialize();

      // Listen for admin broadcasts
      const unsubscribe = NotificationService.onMessage((payload) => {
        console.log('Firebase message received:', payload);
        
        // Show toast notification for admin broadcasts
        if (payload.data?.type === 'admin_broadcast') {
          toast({
            title: payload.notification?.title || 'Admin Notification',
            description: payload.notification?.body || payload.data?.message,
            duration: 8000,
          });
        }
      });

      // Listen for custom admin broadcast events
      const handleAdminBroadcast = (event: CustomEvent) => {
        const { title, body, data } = event.detail;
        
        toast({
          title: title || 'Admin Notification',
          description: body,
          duration: 8000,
        });
      };

      window.addEventListener('adminBroadcast', handleAdminBroadcast as EventListener);

      return () => {
        unsubscribe();
        window.removeEventListener('adminBroadcast', handleAdminBroadcast as EventListener);
      };
    } catch (error) {
      console.error('Error initializing Firebase notifications:', error);
      setState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [toast]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      const result = await requestNotificationPermission();
      
      if (result) {
        setState(prev => ({
          ...prev,
          permission: 'granted',
          token: typeof result === 'string' ? result : prev.token
        }));

        toast({
          title: 'Notifications enabled!',
          description: 'You will now receive push notifications from SocialChat.',
          duration: 5000,
        });

        return true;
      } else {
        setState(prev => ({ ...prev, permission: 'denied' }));
        
        toast({
          variant: 'destructive',
          title: 'Notifications blocked',
          description: 'Please enable notifications in your browser settings.',
          duration: 5000,
        });

        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to enable notifications.',
        duration: 5000,
      });
      return false;
    }
  }, [toast]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    requestPermission,
    initialize
  };
}