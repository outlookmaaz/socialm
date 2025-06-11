import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Volume2,
  VolumeX,
  Filter,
  MoreVertical,
  Clock,
  Calendar,
  Zap,
  Star,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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

interface Notification {
  id: string;
  type: string;
  content: string;
  reference_id: string | null;
  read: boolean;
  created_at: string;
  user_id: string;
  sender_profile?: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

interface NotificationSettings {
  sound: boolean;
  browser: boolean;
  email: boolean;
  friends: boolean;
  messages: boolean;
  likes: boolean;
  comments: boolean;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationGroups, setNotificationGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [settings, setSettings] = useState<NotificationSettings>({
    sound: true,
    browser: true,
    email: false,
    friends: true,
    messages: true,
    likes: true,
    comments: true
  });
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  // Group notifications by date
  const groupNotificationsByDate = useCallback((notifications: Notification[]): NotificationGroup[] => {
    const groups: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      const notificationDate = new Date(notification.created_at);
      let dateKey: string;
      
      if (isToday(notificationDate)) {
        dateKey = 'Today';
      } else if (isYesterday(notificationDate)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(notificationDate, 'MMMM d, yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });
    
    return Object.entries(groups).map(([date, notifications]) => ({
      date,
      notifications: notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }));
  }, []);

  // Filter notifications based on selected filter
  const filterNotifications = useCallback((notifications: Notification[]) => {
    if (selectedFilter === 'all') return notifications;
    if (selectedFilter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === selectedFilter);
  }, [selectedFilter]);

  const fetchNotifications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);

      // Fetch notifications with sender profile information
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender_profile:profiles!notifications_reference_id_fkey(
            name,
            username,
            avatar
          )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching notifications:', error);
        // Create sample notifications for demo
        await createSampleNotifications(user.id);
        return;
      }

      const formattedNotifications = data?.map(notification => ({
        ...notification,
        sender_profile: notification.sender_profile || null
      })) || [];

      setNotifications(formattedNotifications);
      
      const filtered = filterNotifications(formattedNotifications);
      setNotificationGroups(groupNotificationsByDate(filtered));
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      setNotifications([]);
      setNotificationGroups([]);
    } finally {
      setLoading(false);
    }
  }, [filterNotifications, groupNotificationsByDate]);

  const createSampleNotifications = async (userId: string) => {
    try {
      const sampleNotifications = [
        {
          user_id: userId,
          type: 'friend_request',
          content: 'John Doe sent you a friend request',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          type: 'message',
          content: 'Sarah Wilson sent you a message',
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
        },
        {
          user_id: userId,
          type: 'like',
          content: 'Mike Johnson liked your post',
          read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
        },
        {
          user_id: userId,
          type: 'comment',
          content: 'Emma Davis commented on your post',
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
        },
        {
          user_id: userId,
          type: 'friend_accepted',
          content: 'Alex Brown accepted your friend request',
          read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() // 2 days ago
        }
      ];

      for (const notification of sampleNotifications) {
        await supabase
          .from('notifications')
          .insert(notification);
      }
      
      // Fetch again after creating samples
      setTimeout(() => fetchNotifications(false), 1000);
    } catch (error) {
      console.log('Sample notifications creation handled');
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      
      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        // Revert optimistic update on error
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: false } : notif
          )
        );
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to mark notification as read'
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!currentUser) return;

      // Optimistic update
      const originalNotifications = [...notifications];
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        // Revert on error
        setNotifications(originalNotifications);
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
  };

  const clearAllNotifications = async () => {
    try {
      if (!currentUser) return;

      // Optimistic update
      const originalNotifications = [...notifications];
      setNotifications([]);
      setNotificationGroups([]);
      setShowClearDialog(false);

      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .is('deleted_at', null);

      if (error) {
        console.error('Error clearing notifications:', error);
        // Revert on error
        setNotifications(originalNotifications);
        setNotificationGroups(groupNotificationsByDate(filterNotifications(originalNotifications)));
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
  };

  const deleteNotification = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      
      // Optimistic update
      const originalNotifications = [...notifications];
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

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
      } else {
        toast({
          title: 'Notification deleted',
          description: 'The notification has been removed',
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          setSettings(prev => ({ ...prev, browser: true }));
          toast({
            title: 'Notifications enabled',
            description: 'You will now receive push notifications'
          });
          
          // Send a test notification
          new Notification('Notifications Enabled!', {
            body: 'You will now receive real-time notifications',
            icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png'
          });
        } else {
          setSettings(prev => ({ ...prev, browser: false }));
          toast({
            variant: 'destructive',
            title: 'Notifications blocked',
            description: 'Please enable notifications in your browser settings'
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const playNotificationSound = () => {
    if (settings.sound) {
      try {
        const audio = new Audio('/sounds/click.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
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

  const getNotificationPriority = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'message':
        return 'high';
      case 'friend_accepted':
      case 'comment':
        return 'medium';
      default:
        return 'low';
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return format(date, 'MMM d');
  };

  const getDateSeparatorText = (date: string) => {
    if (date === 'Today') return 'Today';
    if (date === 'Yesterday') return 'Yesterday';
    return date;
  };

  // Update notification groups when notifications or filter changes
  useEffect(() => {
    const filtered = filterNotifications(notifications);
    setNotificationGroups(groupNotificationsByDate(filtered));
  }, [notifications, selectedFilter, filterNotifications, groupNotificationsByDate]);

  useEffect(() => {
    fetchNotifications();
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (currentUser) {
      // Set up real-time subscription for notifications
      channelRef.current = supabase
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
              
              // Add to state
              setNotifications(prev => [newNotification, ...prev]);
              
              // Play sound
              playNotificationSound();
              
              // Show browser notification if permission granted
              if (notificationPermission === 'granted' && settings.browser) {
                new Notification('New Notification', {
                  body: newNotification.content,
                  icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                  tag: newNotification.type
                });
              }
              
              // Show toast
              toast({
                title: 'New notification',
                description: newNotification.content,
                duration: 4000
              });
            } else {
              // Refresh for updates/deletes
              fetchNotifications(false);
            }
          }
        )
        .subscribe();

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      };
    }
  }, [currentUser, notificationPermission, settings.browser, settings.sound, fetchNotifications, toast]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredUnreadCount = filterNotifications(notifications).filter(n => !n.read).length;

  const filterOptions = [
    { value: 'all', label: 'All Notifications', icon: Bell },
    { value: 'unread', label: 'Unread Only', icon: AlertCircle },
    { value: 'friend_request', label: 'Friend Requests', icon: UserPlus },
    { value: 'message', label: 'Messages', icon: MessageSquare },
    { value: 'like', label: 'Likes', icon: Heart },
    { value: 'comment', label: 'Comments', icon: MessageSquare },
  ];

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
              onClick={() => setShowFilterDialog(true)}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full hover-scale relative"
            >
              <Filter className="h-4 w-4" />
              {selectedFilter !== 'all' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-social-green rounded-full"></div>
              )}
            </Button>
            
            <Button
              onClick={() => setShowSettings(true)}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full hover-scale"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 rounded-full hover-scale"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-pixelated text-xs">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unreadCount > 0 && (
                  <DropdownMenuItem
                    onClick={markAllAsRead}
                    className="font-pixelated text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-2" />
                    Mark All Read
                  </DropdownMenuItem>
                )}
                {notifications.length > 0 && (
                  <DropdownMenuItem
                    onClick={() => setShowClearDialog(true)}
                    className="font-pixelated text-xs text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Clear All
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {notificationPermission !== 'granted' && (
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
                onClick={requestNotificationPermission}
                size="sm"
                className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs"
              >
                Enable
              </Button>
            </div>
          </div>
        )}

        {/* Filter Info */}
        {selectedFilter !== 'all' && (
          <div className="mx-4 mt-4 p-2 bg-muted/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="font-pixelated text-xs text-muted-foreground">
                Showing: {filterOptions.find(f => f.value === selectedFilter)?.label}
                {selectedFilter === 'unread' && ` (${filteredUnreadCount})`}
              </span>
            </div>
            <Button
              onClick={() => setSelectedFilter('all')}
              size="sm"
              variant="ghost"
              className="h-6 px-2 font-pixelated text-xs"
            >
              Clear Filter
            </Button>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-140px)] p-4 scroll-container">
          {notificationGroups.length > 0 ? (
            <div className="space-y-4">
              {notificationGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  {/* Date Separator */}
                  <div className="flex items-center justify-center py-2">
                    <div className="bg-muted px-3 py-1 rounded-full flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="font-pixelated text-xs text-muted-foreground">
                        {getDateSeparatorText(group.date)}
                      </p>
                    </div>
                  </div>

                  {/* Notifications for this date */}
                  {group.notifications.map((notification) => {
                    const priority = getNotificationPriority(notification.type);
                    const isProcessing = processingIds.has(notification.id);
                    
                    return (
                      <Card 
                        key={notification.id} 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md hover-scale border-l-4 relative ${
                          !notification.read 
                            ? `${getNotificationColor(notification.type)} shadow-sm` 
                            : 'border-l-muted bg-background'
                        } ${isProcessing ? 'opacity-50' : ''}`}
                        onClick={() => !notification.read && !isProcessing && markAsRead(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1 relative">
                              {getNotificationIcon(notification.type)}
                              {priority === 'high' && !notification.read && (
                                <Star className="h-2 w-2 text-yellow-500 absolute -top-1 -right-1 fill-current" />
                              )}
                            </div>
                            
                            {notification.sender_profile && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                {notification.sender_profile.avatar ? (
                                  <AvatarImage src={notification.sender_profile.avatar} />
                                ) : (
                                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                    {notification.sender_profile.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className={`font-pixelated text-sm leading-relaxed ${
                                !notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.content}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <p className="font-pixelated text-xs text-muted-foreground">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <Badge variant="secondary" className="h-4 px-1 text-xs font-pixelated">
                                    New
                                  </Badge>
                                )}
                                {priority === 'high' && (
                                  <Badge variant="destructive" className="h-4 px-1 text-xs font-pixelated">
                                    <Zap className="h-2 w-2 mr-1" />
                                    Priority
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!notification.read && !isProcessing && (
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
                                disabled={isProcessing}
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
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
              <h2 className="font-pixelated text-lg font-medium mb-2">
                {selectedFilter === 'all' ? 'All caught up!' : 'No notifications found'}
              </h2>
              <p className="font-pixelated text-sm text-muted-foreground max-w-sm leading-relaxed">
                {selectedFilter === 'all' 
                  ? "You don't have any notifications right now. When you receive friend requests, messages, likes, or comments, they'll appear here."
                  : `No ${filterOptions.find(f => f.value === selectedFilter)?.label.toLowerCase()} found. Try changing your filter or check back later.`
                }
              </p>
              {selectedFilter !== 'all' && (
                <Button
                  onClick={() => setSelectedFilter('all')}
                  className="mt-4 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                >
                  Show All Notifications
                </Button>
              )}
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
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-pixelated text-sm">Sound Notifications</Label>
                    <p className="font-pixelated text-xs text-muted-foreground">
                      Play sound when receiving notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.sound}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sound: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-pixelated text-sm">Browser Notifications</Label>
                    <p className="font-pixelated text-xs text-muted-foreground">
                      Show browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.browser && notificationPermission === 'granted'}
                    onCheckedChange={(checked) => {
                      if (checked && notificationPermission !== 'granted') {
                        requestNotificationPermission();
                      } else {
                        setSettings(prev => ({ ...prev, browser: checked }));
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-pixelated text-sm">Email Notifications</Label>
                    <p className="font-pixelated text-xs text-muted-foreground">
                      Receive email summaries (Coming Soon)
                    </p>
                  </div>
                  <Switch
                    checked={settings.email}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email: checked }))}
                    disabled
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-pixelated text-sm font-medium mb-3">Notification Types</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-social-blue" />
                      <Label className="font-pixelated text-xs">Friend Requests</Label>
                    </div>
                    <Switch
                      checked={settings.friends}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, friends: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-social-green" />
                      <Label className="font-pixelated text-xs">Messages</Label>
                    </div>
                    <Switch
                      checked={settings.messages}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, messages: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-social-magenta" />
                      <Label className="font-pixelated text-xs">Likes</Label>
                    </div>
                    <Switch
                      checked={settings.likes}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, likes: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-social-purple" />
                      <Label className="font-pixelated text-xs">Comments</Label>
                    </div>
                    <Switch
                      checked={settings.comments}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, comments: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs hover-scale"
              >
                Save Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filter Dialog */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="max-w-md mx-auto animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-lg social-gradient bg-clip-text text-transparent flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Notifications
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                const count = option.value === 'all' 
                  ? notifications.length 
                  : option.value === 'unread'
                  ? notifications.filter(n => !n.read).length
                  : notifications.filter(n => n.type === option.value).length;

                return (
                  <Button
                    key={option.value}
                    onClick={() => {
                      setSelectedFilter(option.value);
                      setShowFilterDialog(false);
                    }}
                    variant={selectedFilter === option.value ? "default" : "outline"}
                    className={`w-full justify-between font-pixelated text-xs h-10 ${
                      selectedFilter === option.value 
                        ? 'bg-social-green text-white' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-xs">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
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

export default Notifications;