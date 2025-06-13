import React, { useEffect } from 'react';
import { usePushAlertNotifications } from '@/hooks/use-pushalert-notifications';
import { useToast } from '@/hooks/use-toast';

export function PushAlertManager() {
  const { isInitialized, isSupported, subscriptionId } = usePushAlertNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (isInitialized && isSupported) {
      console.log('PushAlert Manager: Notifications ready');
      
      // Show success toast when PushAlert is ready
      toast({
        title: 'Push Notifications Ready',
        description: 'You will receive real-time notifications for messages and activities',
        duration: 3000,
      });
    }
  }, [isInitialized, isSupported, toast]);

  // This component doesn't render anything visible
  // It just manages PushAlert integration in the background
  return null;
}