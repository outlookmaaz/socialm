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
  UserCheck,
  UserMinus
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

interface NotificationData {
  id: string;
  type: string;
  content: string;
  reference_id?: string;
  read: boolean;
  created_at: string;
  user_id: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGranted, setIsGranted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInfo, setShowInfo] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          // Check notification permission
          if ('Notification' in window) {
            setIsGranted(Notification.permission === 'granted');
          }
          
          // Load notifications
          await fetchNotifications(user.id);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeNotifications();

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch notifications from database
  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        // Create some sample notifications for demo
        const sampleNotifications = [
          {
            id: '1',
            type: 'like',
            content: 'Owais liked your post',
            read: false,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            user_id: userId
          },
          {
            id: '2',
            type: 'like',
            content: 'Owais liked your post',
            read: false,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            user_id: userId
          },
          {
            id: '3',
            type: 'comment',
            content: 'raafi jameel commented on your post',
            read: false,
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            user_id: userId
          },
          {
            id: '4',
            type: 'like',
            content: 'Roohi Fida liked your post',
            read: false,
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            user_id: userId
          }
        ];
        setNotifications(sampleNotifications);
        setUnreadCount(sampleNotifications.filter(n => !n.read).length);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Setup real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    const setupRealtimeSubscriptions = () => {
      // Notifications subscription
      const notificationsChannel = supabase
        .channel(`notifications-realtime-${currentUser.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        }, async (payload) => {
          const newNotification = payload.new as NotificationData;
          
          // Add to state immediately
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show browser notification
          if (isGranted) {
            new Notification(getNotificationTitle(newNotification.type), {
              body: newNotification.content,
              icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
              tag: newNotification.type
            });
          }

          // Show toast
          toast({
            title: getNotificationTitle(newNotification.type),
            description: newNotification.content,
            duration: 4000
          });
        })
        .subscribe();

      // Messages subscription - create notification when message received
      const messagesChannel = supabase
        .channel(`messages-realtime-${currentUser.id}`)
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
            .select('name, username')
            .eq('id', message.sender_id)
            .single();

          if (sender) {
            // Create notification
            const { data: notification } = await supabase
              .from('notifications')
              .insert({
                user_id: currentUser.id,
                type: 'message',
                content: `${sender.name} sent you a message`,
                reference_id: message.id,
                read: false
              })
              .select()
              .single();

            if (notification) {
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        })
        .subscribe();

      // Friend requests subscription
      const friendsChannel = supabase
        .channel(`friends-realtime-${currentUser.id}`)
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
            .select('name, username')
            .eq('id', friendship.sender_id)
            .single();

          if (sender) {
            // Create notification
            const { data: notification } = await supabase
              .from('notifications')
              .insert({
                user_id: currentUser.id,
                type: 'friend_request',
                content: `${sender.name} sent you a friend request`,
                reference_id: friendship.id,
                read: false
              })
              .select()
              .single();

            if (notification) {
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        })
        .subscribe();

      // Likes subscription
      const likesChannel = supabase
        .channel(`likes-realtime-${currentUser.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'likes'
        }, async (payload) => {
          const like = payload.new;
          
          // Check if this is a like on current user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id, content')
            .eq('id', like.post_id)
            .single();

          if (post && post.user_id === currentUser.id && like.user_id !== currentUser.id) {
            // Get liker info
            const { data: liker } = await supabase
              .from('profiles')
              .select('name, username')
              .eq('id', like.user_id)
              .single();

            if (liker) {
              // Create notification
              const { data: notification } = await supabase
                .from('notifications')
                .insert({
                  user_id: currentUser.id,
                  type: 'like',
                  content: `${liker.name} liked your post`,
                  reference_id: like.post_id,
                  read: false
                })
                .select()
                .single();

              if (notification) {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
              }
            }
          }
        })
        .subscribe();

      // Comments subscription
      const commentsChannel = supabase
        .channel(`comments-realtime-${currentUser.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        }, async (payload) => {
          const comment = payload.new;
          
          // Check if this is a comment on current user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id, content')
            .eq('id', comment.post_id)
            .single();

          if (post && post.user_id === currentUser.id && comment.user_id !== currentUser.id) {
            // Get commenter info
            const { data: commenter } = await supabase
              .from('profiles')
              .select('name, username')
              .eq('id', comment.user_id)
              .single();

            if (commenter) {
              // Create notification
              const { data: notification } = await supabase
                .from('notifications')
                .insert({
                  user_id: currentUser.id,
                  type: 'comment',
                  content: `${commenter.name} commented on your post`,
                  reference_id: comment.post_id,
                  read: false
                })
                .select()
                .single();

              if (notification) {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
              }
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(friendsChannel);
        supabase.removeChannel(likesChannel);
        supabase.removeChannel(commentsChannel);
      };
    };

    const cleanup = setupRealtimeSubscriptions();

    return cleanup;
  }, [currentUser, isGranted, toast]);

  // Auto-refresh notifications
  useEffect(() => {
    if (!currentUser || !isOnline) return;

    const refreshInterval = setInterval(() => {
      fetchNotifications(currentUser.id);
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [currentUser, isOnline]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: 'All notifications marked as read',
        description: 'Your notifications have been updated',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .is('deleted_at', null);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      setShowClearDialog(false);

      toast({
        title: 'All notifications cleared',
        description: 'Your notifications have been cleared',
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setIsGranted(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive real-time notifications',
          duration: 3000
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
  };

  // Handle friend request actions
  const handleFriendRequest = async (notificationId: string, referenceId: string, action: 'accept' | 'reject') => {
    if (processingRequests.has(notificationId)) return;

    try {
      setProcessingRequests(prev => new Set(prev).add(notificationId));

      if (action === 'accept') {
        // Accept friend request
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', referenceId);

        if (error) throw error;

        toast({
          title: 'Friend request accepted',
          description: 'You are now friends!',
        });
      } else {
        // Reject friend request
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('id', referenceId);

        if (error) throw error;

        // Create notification for the requester
        const { data: friendship } = await supabase
          .from('friends')
          .select('sender_id, profiles:sender_id(name)')
          .eq('id', referenceId)
          .single();

        if (friendship) {
          await supabase
            .from('notifications')
            .insert({
              user_id: friendship.sender_id,
              type: 'friend_rejected',
              content: `${currentUser.name || 'Someone'} rejected your friend request`,
              read: false
            });
        }

        toast({
          title: 'Friend request rejected',
          description: 'The friend request has been rejected',
        });
      }

      // Remove notification
      await deleteNotification(notificationId);

    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${action} friend request`,
      });
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-social-blue" />;
      case 'friend_accepted':
        return <User className="h-4 w-4 text-social-green" />;
      case 'friend_rejected':
        return <UserMinus className="h-4 w-4 text-destructive" />;
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

  const getUserAvatar = (content: string) => {
    const userName = content.split(' ')[0];
    return userName.substring(0, 2).toUpperCase();
  };

  const getUsernameFromContent = (content: string) => {
    if (content.includes('Owais')) return '@owais';
    if (content.includes('raafi')) return '@raafi';
    if (content.includes('Roohi')) return '@roohi14';
    return '@user';
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
          <div className="mx-4 mt-4 p-3 bg-social-blue/10 border border-social-blue/20 rounded-lg">
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
                className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs"
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
                      <Avatar className="h-10 w-10 border-2 border-social-green/20">
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {getUserAvatar(notification.content)}
                        </AvatarFallback>
                      </Avatar>
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
                          <p className="font-pixelated text-xs text-muted-foreground">
                            {getUsernameFromContent(notification.content)}
                          </p>
                          {!notification.read && (
                            <Badge variant="secondary" className="h-4 px-1 text-xs font-pixelated">
                              New
                            </Badge>
                          )}
                        </div>

                        {/* Friend Request Actions */}
                        {notification.type === 'friend_request' && notification.reference_id && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequest(notification.id, notification.reference_id!, 'accept');
                              }}
                              size="sm"
                              className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6"
                              disabled={processingRequests.has(notification.id)}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequest(notification.id, notification.reference_id!, 'reject');
                              }}
                              size="sm"
                              variant="outline"
                              className="font-pixelated text-xs h-6"
                              disabled={processingRequests.has(notification.id)}
                            >
                              <UserMinus className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
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
              <p className="font-pixelated text-sm text-muted-foreground max-w-sm leading-relaxed">
                You don't have any notifications right now. When you receive friend requests, messages, likes, or comments, they'll appear here.
              </p>
              <Button
                onClick={requestPermission}
                className="mt-4 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                disabled={isGranted}
              >
                {isGranted ? 'Notifications Enabled' : 'Enable Push Notifications'}
              </Button>
            </div>
          )}
        </ScrollArea>

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
                    <p className="font-pixelated text-xs text-muted-foreground">New friend requests and acceptances</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-social-magenta/10 rounded-lg">
                  <Heart className="h-4 w-4 text-social-magenta" />
                  <div>
                    <p className="font-pixelated text-xs font-medium">Likes & Comments</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Interactions on your posts</p>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                  Enable push notifications to receive alerts even when you're on other tabs or apps!
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
                onClick={clearAllNotifications}
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

export default Notifications;