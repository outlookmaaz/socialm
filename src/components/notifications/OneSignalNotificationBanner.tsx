import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Smartphone, Monitor } from 'lucide-react';
import { useOneSignalNotifications } from '@/hooks/use-onesignal-notifications';

interface OneSignalNotificationBannerProps {
  onDismiss?: () => void;
}

export function OneSignalNotificationBanner({ onDismiss }: OneSignalNotificationBannerProps) {
  const { oneSignalUser, isLoading, requestPermission } = useOneSignalNotifications();

  // Don't show banner if already subscribed or permission denied
  if (isLoading || oneSignalUser.subscribed || oneSignalUser.permission === 'denied') {
    return null;
  }

  const handleEnableNotifications = async () => {
    const success = await requestPermission();
    if (success && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-social-green/10 to-social-blue/10 border border-social-green/20 rounded-lg animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            <Bell className="h-5 w-5 text-social-green" />
          </div>
          <div className="flex-1">
            <h3 className="font-pixelated text-sm font-medium text-social-green mb-2">
              🔔 Enable Push Notifications
            </h3>
            <p className="font-pixelated text-xs text-muted-foreground mb-3 leading-relaxed">
              Get instant notifications for new messages, friend requests, and activities - even when SocialChat is closed!
            </p>
            
            {/* Platform Support Icons */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1">
                <Monitor className="h-3 w-3 text-social-blue" />
                <span className="font-pixelated text-xs text-muted-foreground">Desktop</span>
              </div>
              <div className="flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-social-green" />
                <span className="font-pixelated text-xs text-muted-foreground">Mobile</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-pixelated text-xs text-social-purple">🍎 macOS Safari</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleEnableNotifications}
                size="sm"
                className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs hover-scale"
              >
                <Bell className="h-3 w-3 mr-1" />
                Enable Notifications
              </Button>
              
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="font-pixelated text-xs text-muted-foreground hover:text-foreground"
                >
                  Maybe Later
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {onDismiss && (
          <Button
            onClick={onDismiss}
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-social-green/20">
        <p className="font-pixelated text-xs text-muted-foreground">
          ✨ <strong>Works on all platforms:</strong> Chrome, Firefox, Safari, Edge, and mobile browsers
        </p>
      </div>
    </div>
  );
}