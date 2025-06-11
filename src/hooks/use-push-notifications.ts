import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationHook {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => void;
}

export function usePushNotifications(): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser'
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications'
        });
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings'
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to request notification permission'
      });
      return false;
    }
  }, [isSupported, toast]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // For demo purposes, we'll use a dummy VAPID key
      // In production, you would use your actual VAPID key from Firebase
      const vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI6YrrC_VXBkVxJ8ItFfn5En0dpjq7S8wGFfBXMJvQZDPas_8spnSx0VVA';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      // Store subscription in your backend
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // You would typically save this subscription to your database
        console.log('Push subscription:', subscription);
      }

      setIsSubscribed(true);
      toast({
        title: 'Subscribed',
        description: 'Successfully subscribed to push notifications'
      });
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: 'Failed to subscribe to push notifications'
      });
      return false;
    }
  }, [isSupported, permission, toast]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast({
          title: 'Unsubscribed',
          description: 'Successfully unsubscribed from push notifications'
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to unsubscribe from push notifications'
      });
      return false;
    }
  }, [toast]);

  const sendTestNotification = useCallback(() => {
    if (permission === 'granted') {
      new Notification('SocialChat Test', {
        body: 'This is a test notification from SocialChat!',
        icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
        badge: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false
      });
    }
  }, [permission]);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}