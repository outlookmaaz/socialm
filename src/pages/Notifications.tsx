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
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedNotifications } from '@/hooks/use-enhanced-notifications';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
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
  const {
    notifications,
    unreadCount,
    isGranted,
    isOnline,
    soundEnabled,
    setSoundEnabled,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestPermission,
    fetchNotifications
  } = useEnhancedNotifications();

  const [notificationGroups, setNotificationGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [settings, setSettings] = useState<NotificationSettings>({
    sound: soundEnabled,
    browser: isGranted,
    email: false,
    friends: true,
    messages: true,
    likes: true,
    comments: true
  });
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
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

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
      toast({
        title: 'Notifications refreshed',
        description: 'Your notifications have been updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: 'Failed to refresh notifications',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      await markAsRead(notificationId);
      toast({
        title: 'Marked as read',
        description: 'Notification has been marked as read',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notification as read'
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      await deleteNotification(notificationId);
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete notification'
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: 'All notifications marked as read',
        description: 'Your notifications have been updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark all notifications as read'
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setShowClearDialog(false);
      toast({
        title: 'All notifications cleared',
        description: 'Your notifications have been cleared',
      });
    } catch (error) {
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
    setLoading(false);
  }, [notifications, selectedFilter, filterNotifications, groupNotificationsByDate]);

  // Update settings when sound preference changes
  useEffect(() => {
    setSettings(prev => ({ ...prev, sound: soundEnabled }));
  }, [soundEnabled]);

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
              onClick={handleRefresh}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full hover-scale"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
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
                    onClick={handleMarkAllAsRead}
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
                        onClick={() => !notification.read && !isProcessing && handleMarkAsRead(notification.id)}
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
                                    handleMarkAsRead(notification.id);
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
                                  handleDeleteNotification(notification.id);
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
                    <Label className="font-pixelated text-sm flex items-center gap-2">
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      Sound Notifications
                    </Label>
                    <p className="font-pixelated text-xs text-muted-foreground">
                      Play sound when receiving notifications
                    </p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
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
                    checked={isGranted}
                    onCheckedChange={(checked) => {
                      if (checked && !isGranted) {
                        requestPermission();
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
                onClick={handleClearAll}
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