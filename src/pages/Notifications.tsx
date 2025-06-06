import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Check, Trash2, User, MessageSquare, Heart, UserPlus, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: string;
  content: string;
  reference_id: string | null;
  read: boolean;
  created_at: string;
  user_id: string;
  sender_name?: string;
  sender_avatar?: string;
}

// Local storage fallback for notifications
const NOTIFICATIONS_STORAGE_KEY = 'socialchat_notifications';

const getStoredNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to store notifications:', error);
  }
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [useDatabase, setUseDatabase] = useState(true);
  const { toast } = useToast();

  // Create notification in database or localStorage
  const createNotification = async (userId: string, type: string, content: string, referenceId?: string) => {
    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      content,
      reference_id: referenceId || null,
      read: false,
      created_at: new Date().toISOString()
    };

    if (useDatabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            content,
            reference_id: referenceId || null,
            read: false
          });

        if (error) throw error;
        return;
      } catch (error) {
        console.error('Database notification failed, using localStorage:', error);
        setUseDatabase(false);
      }
    }

    // Fallback to localStorage
    const stored = getStoredNotifications();
    const updated = [newNotification, ...stored].slice(0, 100); // Keep only last 100
    storeNotifications(updated);
    setNotifications(updated);
  };

  // Setup notification triggers for real-time events
  const setupNotificationTriggers = async () => {
    if (!currentUser) return;

    // Listen for friend requests
    const friendsChannel = supabase
      .channel('friends-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'friends',
          filter: `receiver_id=eq.${currentUser.id}`
        }, 
        async (payload) => {
          try {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            if (senderProfile) {
              await createNotification(
                currentUser.id,
                'friend_request',
                `${senderProfile.name} sent you a friend request`,
                payload.new.id
              );
              
              // Show push notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Friend Request', {
                  body: `${senderProfile.name} sent you a friend request`,
                  icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                  tag: 'friend-request'
                });
              }
            }
          } catch (error) {
            console.error('Error handling friend request notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for friend request acceptances
    const friendAcceptChannel = supabase
      .channel('friend-accept-notifications')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'friends',
          filter: `sender_id=eq.${currentUser.id}`
        }, 
        async (payload) => {
          try {
            if (payload.new.status === 'accepted' && payload.old.status === 'pending') {
              const { data: receiverProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.receiver_id)
                .single();

              if (receiverProfile) {
                await createNotification(
                  currentUser.id,
                  'friend_accepted',
                  `${receiverProfile.name} accepted your friend request`,
                  payload.new.id
                );
                
                // Show push notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Friend Request Accepted', {
                    body: `${receiverProfile.name} accepted your friend request`,
                    icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                    tag: 'friend-accepted'
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error handling friend accept notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for likes on user's posts
    const likesChannel = supabase
      .channel('likes-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'likes'
        }, 
        async (payload) => {
          try {
            // Get post details to check if it belongs to current user
            const { data: post } = await supabase
              .from('posts')
              .select('user_id, content')
              .eq('id', payload.new.post_id)
              .single();

            if (post && post.user_id === currentUser.id && payload.new.user_id !== currentUser.id) {
              const { data: likerProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.user_id)
                .single();

              if (likerProfile) {
                await createNotification(
                  currentUser.id,
                  'like',
                  `${likerProfile.name} liked your post`,
                  payload.new.post_id
                );
                
                // Show push notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('New Like', {
                    body: `${likerProfile.name} liked your post`,
                    icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                    tag: 'like'
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error handling like notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for comments on user's posts
    const commentsChannel = supabase
      .channel('comments-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments'
        }, 
        async (payload) => {
          try {
            // Get post details to check if it belongs to current user
            const { data: post } = await supabase
              .from('posts')
              .select('user_id, content')
              .eq('id', payload.new.post_id)
              .single();

            if (post && post.user_id === currentUser.id && payload.new.user_id !== currentUser.id) {
              const { data: commenterProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.user_id)
                .single();

              if (commenterProfile) {
                await createNotification(
                  currentUser.id,
                  'comment',
                  `${commenterProfile.name} commented on your post`,
                  payload.new.post_id
                );
                
                // Show push notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('New Comment', {
                    body: `${commenterProfile.name} commented on your post`,
                    icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                    tag: 'comment'
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error handling comment notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for new messages
    const messagesChannel = supabase
      .channel('messages-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        }, 
        async (payload) => {
          try {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            if (senderProfile) {
              await createNotification(
                currentUser.id,
                'message',
                `${senderProfile.name} sent you a message`,
                payload.new.id
              );
              
              // Show push notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Message', {
                  body: `${senderProfile.name}: ${payload.new.content.substring(0, 50)}${payload.new.content.length > 50 ? '...' : ''}`,
                  icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                  tag: 'message'
                });
              }
            }
          } catch (error) {
            console.error('Error handling message notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(friendAcceptChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);

      if (useDatabase) {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

          if (error) throw error;

          setNotifications(data || []);
          return;
        } catch (error) {
          console.error('Database fetch failed, using localStorage:', error);
          setUseDatabase(false);
        }
      }

      // Fallback to localStorage
      const stored = getStoredNotifications();
      setNotifications(stored);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Use localStorage as fallback
      const stored = getStoredNotifications();
      setNotifications(stored);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (useDatabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) throw error;
      } catch (error) {
        console.error('Database update failed, using localStorage:', error);
        setUseDatabase(false);
      }
    }

    // Update local state
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    // Update localStorage
    if (!useDatabase) {
      const updated = notifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      storeNotifications(updated);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!currentUser) return;

      if (useDatabase) {
        try {
          const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', currentUser.id)
            .eq('read', false);

          if (error) throw error;
        } catch (error) {
          console.error('Database update failed, using localStorage:', error);
          setUseDatabase(false);
        }
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      // Update localStorage
      if (!useDatabase) {
        const updated = notifications.map(notif => ({ ...notif, read: true }));
        storeNotifications(updated);
      }

      toast({
        title: 'All notifications marked as read',
        description: 'Your notifications have been updated',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notifications as read'
      });
    }
  };

  const clearAllNotifications = async () => {
    try {
      if (!currentUser) return;

      if (useDatabase) {
        try {
          const { error } = await supabase
            .from('notifications')
            .update({ deleted_at: new Date().toISOString() })
            .eq('user_id', currentUser.id)
            .is('deleted_at', null);

          if (error) throw error;
        } catch (error) {
          console.error('Database delete failed, using localStorage:', error);
          setUseDatabase(false);
        }
      }

      // Clear local state
      setNotifications([]);

      // Clear localStorage
      if (!useDatabase) {
        storeNotifications([]);
      }

      toast({
        title: 'All notifications cleared',
        description: 'Your notifications have been cleared',
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear notifications'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-social-blue" />;
      case 'friend_accepted':
        return <User className="h-4 w-4 text-social-green" />;
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

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive push notifications'
        });
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Set up real-time subscription for notifications (only if using database)
      let notificationsChannel: any = null;
      
      if (useDatabase) {
        notificationsChannel = supabase
          .channel('notifications-realtime')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`
            }, 
            (payload) => {
              console.log('Notification change:', payload);
              if (payload.eventType === 'INSERT') {
                const newNotification = payload.new as Notification;
                setNotifications(prev => [newNotification, ...prev]);
              } else {
                fetchNotifications();
              }
            }
          )
          .subscribe();
      }

      // Setup notification triggers
      const cleanupTriggers = setupNotificationTriggers();

      return () => {
        if (notificationsChannel) {
          supabase.removeChannel(notificationsChannel);
        }
        cleanupTriggers?.then(cleanup => cleanup?.());
      };
    }
  }, [currentUser, useDatabase]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-3">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
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
        <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="font-pixelated text-base">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-social-green text-white text-xs font-pixelated px-2 py-1 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
            {!useDatabase && (
              <span className="bg-yellow-500 text-white text-xs font-pixelated px-2 py-1 rounded-full">
                Local
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowInfo(true)}
              size="icon"
              className="h-7 w-7 rounded-full bg-social-blue hover:bg-social-blue/90 text-white hover-scale"
            >
              <Info className="h-4 w-4" />
            </Button>
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    size="sm"
                    className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-7 hover-scale"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark All Read
                  </Button>
                )}
                <Button
                  onClick={clearAllNotifications}
                  size="sm"
                  variant="destructive"
                  className="font-pixelated text-xs h-7 hover-scale"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Info Dialog */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-sm mx-auto animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
                Real-time Notifications
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Get instant notifications for friend requests, messages, likes, and comments.
              </p>
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Push notifications work even when you're on other tabs!
              </p>
              {!useDatabase && (
                <p className="font-pixelated text-xs text-yellow-600 leading-relaxed">
                  Currently using local storage for notifications.
                </p>
              )}
              <Button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6 hover-scale"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-120px)] p-3 scroll-container">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover-scale ${
                    !notification.read 
                      ? 'border-social-green/50 bg-social-green/5 shadow-sm' 
                      : 'bg-background'
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-pixelated text-xs text-foreground leading-relaxed">
                          {notification.content}
                        </p>
                        <p className="font-pixelated text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-social-green rounded-full flex-shrink-0 mt-2 animate-pulse" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h2 className="font-pixelated text-sm font-medium mb-2">No notifications yet</h2>
              <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                When you receive friend requests, messages, likes, or comments, they'll appear here in real-time.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;