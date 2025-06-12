import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Check, 
  Trash2, 
  User, 
  MessageSquare, 
  Heart, 
  UserPlus, 
  Info, 
  CheckCheck, 
  X,
  Wifi,
  WifiOff,
  UserX,
  Settings,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEnhancedNotifications } from '@/hooks/use-enhanced-notifications';

export function Notifications() {
  const {
    notifications,
    unreadCount,
    isGranted,
    isOnline,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestPermission,
    fetchNotifications
  } = useEnhancedNotifications();

  const [showInfo, setShowInfo] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setTimeout(() => setRefreshing(false), 1000);
    toast({
      title: 'Notifications refreshed',
      description: 'Your notifications have been updated',
      duration: 2000
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-social-blue" />;
      case 'friend_accepted':
        return <User className="h-4 w-4 text-social-green" />;
      case 'friend_rejected':
        return <UserX className="h-4 w-4 text-destructive" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-social-green" />;
      case 'like':
        return <Heart className="h-4 w-4 text-social-magenta" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-social-purple" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'border-l-social-blue bg-social-blue/5';
      case 'friend_accepted':
        return 'border-l-social-green bg-social-green/5';
      case 'friend_rejected':
        return 'border-l-destructive bg-destructive/5';
      case 'message':
        return 'border-l-social-green bg-social-green/5';
      case 'like':
        return 'border-l-social-magenta bg-social-magenta/5';
      case 'comment':
        return 'border-l-social-purple bg-social-purple/5';
      default:
        return 'border-l-muted-foreground bg-muted/5';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-3">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                    <div className="h-6 w-6 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-primary" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {/* Connection status indicator */}
              <div className="absolute -bottom-1 -right-1">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-social-green" />
                ) : (
                  <WifiOff className="w-3 h-3 text-destructive" />
                )}
              </div>
            </div>
            <div>
              <h1 className="font-pixelated text-lg font-medium">Notifications</h1>
              <p className="font-pixelated text-xs text-muted-foreground">
                {notifications.length} total • {unreadCount} unread • {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full hover-scale"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              onClick={() => setShowSettings(true)}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full hover-scale"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={() => setShowInfo(true)}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full hover-scale"
            >
              <Info className="h-4 w-4" />
            </Button>
            
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    size="sm"
                    className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8 hover-scale"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark All Read
                  </Button>
                )}
                <Button
                  onClick={() => setShowClearDialog(true)}
                  size="sm"
                  variant="destructive"
                  className="font-pixelated text-xs h-8 hover-scale"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Notification Permission Banner */}
        {!isGranted && (
          <div className="mx-4 mt-4 p-3 bg-social-blue/10 border border-social-blue/20 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-social-blue" />
                <div>
                  <p className="font-pixelated text-xs font-medium text-social-blue">Enable Push Notifications</p>
                  <p className="font-pixelated text-xs text-muted-foreground">Get notified instantly when you receive messages or friend requests</p>
                </div>
              </div>
              <Button
                onClick={requestPermission}
                size="sm"
                className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs hover-scale"
              >
                Enable
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-140px)] p-4 scroll-container">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover-scale border-l-4 ${
                    !notification.read 
                      ? `${getNotificationColor(notification.type)} shadow-sm` 
                      : 'border-l-muted bg-background'
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-pixelated text-sm leading-relaxed ${
                          !notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="font-pixelated text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          {!notification.read && (
                            <Badge variant="secondary" className="h-4 px-1 text-xs font-pixelated">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 hover:bg-social-green/10"
                          >
                            <Check className="h-3 w-3 text-social-green" />
                          </Button>
                        )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="relative mb-6">
                <Bell className="h-20 w-20 text-muted-foreground opacity-50" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-social-green rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <h2 className="font-pixelated text-lg font-medium mb-2">All caught up!</h2>
              <p className="font-pixelated text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
                You don't have any notifications right now. When you receive friend requests, messages, likes, or comments, they'll appear here.
              </p>
              <Button
                onClick={requestPermission}
                className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs hover-scale"
                disabled={isGranted}
              >
                {isGranted ? 'Notifications Enabled ✓' : 'Enable Push Notifications'}
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md mx-auto animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-lg social-gradient bg-clip-text text-transparent flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-social-green" />
                    <span className="font-pixelated text-xs">Push Notifications</span>
                  </div>
                  <Badge variant={isGranted ? "default" : "secondary"} className="font-pixelated text-xs">
                    {isGranted ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-social-blue" />
                    <span className="font-pixelated text-xs">Real-time Updates</span>
                  </div>
                  <Badge variant={isOnline ? "default" : "destructive"} className="font-pixelated text-xs">
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="h-4 w-4 text-social-purple" />
                    <span className="font-pixelated text-xs">Auto-mark as Read</span>
                  </div>
                  <Badge variant="outline" className="font-pixelated text-xs">
                    On Click
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                {!isGranted && (
                  <Button 
                    onClick={requestPermission}
                    className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs hover-scale"
                  >
                    Enable Push Notifications
                  </Button>
                )}
                <Button 
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="w-full font-pixelated text-xs hover-scale"
                >
                  Close Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Dialog */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-md mx-auto animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-lg social-gradient bg-clip-text text-transparent flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Real-time Notifications
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-social-green/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-social-green" />
                  <div>
                    <p className="font-pixelated text-xs font-medium">Messages</p>
                    <p className="font-pixelated text-xs text-muted-foreground">New direct messages from friends</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-social-blue/10 rounded-lg">
                  <UserPlus className="h-4 w-4 text-social-blue" />
                  <div>
                    <p className="font-pixelated text-xs font-medium">Friend Requests</p>
                    <p className="font-pixelated text-xs text-muted-foreground">New friend requests and responses</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-social-magenta/10 rounded-lg">
                  <Heart className="h-4 w-4 text-social-magenta" />
                  <div>
                    <p className="font-pixelated text-xs font-medium">Likes & Comments</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Interactions on your posts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <UserX className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="font-pixelated text-xs font-medium">Friend Request Rejected</p>
                    <p className="font-pixelated text-xs text-muted-foreground">When someone declines your friend request</p>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                  Enable push notifications to receive alerts even when you're on other tabs or apps! All notifications are real-time and work seamlessly across devices.
                </p>
              </div>
              <Button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs hover-scale"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Clear All Confirmation Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent className="max-w-md mx-auto animate-in zoom-in-95 duration-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-pixelated text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Clear All Notifications
              </AlertDialogTitle>
              <AlertDialogDescription className="font-pixelated text-xs">
                Are you sure you want to clear all notifications? This action cannot be undone and will remove all {notifications.length} notifications from your list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await clearAllNotifications();
                  setShowClearDialog(false);
                  toast({
                    title: 'All notifications cleared',
                    description: 'Your notifications have been cleared successfully',
                  });
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;