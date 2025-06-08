import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, UserCheck, Search, MessageCircle, UserMinus, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
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

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  status: 'accepted' | 'pending' | 'suggested';
  created_at: string;
  friend_id?: string;
}

export function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [suggested, setSuggested] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState<{show: boolean, friend: Friend | null}>({show: false, friend: null});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
      fetchSuggestedFriends();
      
      // Set up real-time subscriptions
      const friendsChannel = supabase
        .channel('friends-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'friends' }, 
          () => {
            fetchFriends();
            fetchFriendRequests();
            fetchSuggestedFriends();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(friendsChannel);
      };
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          sender_id,
          receiver_id,
          sender_profile:profiles!friends_sender_id_fkey(id, name, username, avatar),
          receiver_profile:profiles!friends_receiver_id_fkey(id, name, username, avatar)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (error) throw error;

      const friendsList = data?.map(friendship => {
        const isCurrentUserSender = friendship.sender_id === currentUser.id;
        const friendProfile = isCurrentUserSender 
          ? friendship.receiver_profile 
          : friendship.sender_profile;
        
        return {
          id: friendProfile.id,
          name: friendProfile.name,
          username: friendProfile.username,
          avatar: friendProfile.avatar,
          status: 'accepted' as const,
          created_at: friendship.created_at,
          friend_id: friendship.id
        };
      }) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          sender_id,
          sender_profile:profiles!friends_sender_id_fkey(id, name, username, avatar)
        `)
        .eq('status', 'pending')
        .eq('receiver_id', currentUser.id);

      if (error) throw error;

      const requestsList = data?.map(request => ({
        id: request.sender_profile.id,
        name: request.sender_profile.name,
        username: request.sender_profile.username,
        avatar: request.sender_profile.avatar,
        status: 'pending' as const,
        created_at: request.created_at,
        friend_id: request.id
      })) || [];

      setRequests(requestsList);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const fetchSuggestedFriends = async () => {
    try {
      if (!currentUser) return;

      // Get users who are not already friends or have pending requests
      const { data: existingConnections } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      const connectedUserIds = new Set();
      existingConnections?.forEach(conn => {
        connectedUserIds.add(conn.sender_id);
        connectedUserIds.add(conn.receiver_id);
      });
      connectedUserIds.add(currentUser.id); // Exclude current user

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, created_at')
        .not('id', 'in', `(${Array.from(connectedUserIds).join(',')})`)
        .limit(10);

      if (error) throw error;

      const suggestedList = data?.map(profile => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        status: 'suggested' as const,
        created_at: profile.created_at
      })) || [];

      setSuggested(suggestedList);
    } catch (error) {
      console.error('Error fetching suggested friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      if (!currentUser) return;

      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: currentUser.id,
          receiver_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      // Remove from suggested list
      setSuggested(prev => prev.filter(user => user.id !== userId));

      toast({
        title: 'Friend request sent',
        description: 'Your friend request has been sent successfully',
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request',
      });
    }
  };

  const acceptFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendId);

      if (error) throw error;

      // Refresh all lists
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchSuggestedFriends()
      ]);

      toast({
        title: 'Friend request accepted',
        description: 'You are now friends!',
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept friend request',
      });
    }
  };

  const rejectFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;

      // Remove from requests list
      setRequests(prev => prev.filter(req => req.friend_id !== friendId));

      toast({
        title: 'Friend request rejected',
        description: 'The friend request has been rejected',
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject friend request',
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      // Immediately remove from UI
      setFriends(prev => prev.filter(friend => friend.friend_id !== friendId));
      setShowRemoveDialog({show: false, friend: null});

      // Delete from database
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;

      toast({
        title: 'Friend removed',
        description: 'Friend has been removed from your list and chat access blocked',
      });
    } catch (error) {
      console.error('Error removing friend:', error);
      // Revert UI change if database operation failed
      fetchFriends();
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove friend',
      });
    }
  };

  const openChat = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const filterUsers = (users: Friend[]) => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  };

  const UserCard = ({ user, type }: { user: Friend; type: 'friend' | 'request' | 'suggested' }) => (
    <Card className="hover:shadow-md transition-all duration-200 hover-scale">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-social-green">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-sm">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-pixelated text-sm font-medium truncate">{user.name}</h3>
            <p className="font-pixelated text-xs text-muted-foreground truncate">@{user.username}</p>
            <p className="font-pixelated text-xs text-muted-foreground">
              {type === 'friend' ? 'Friends since' : type === 'request' ? 'Requested' : 'Joined'} {' '}
              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {type === 'friend' && (
              <>
                <Button
                  onClick={() => openChat(user.id)}
                  size="sm"
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat
                </Button>
                <Button
                  onClick={() => setShowRemoveDialog({show: true, friend: user})}
                  size="sm"
                  variant="destructive"
                  className="font-pixelated text-xs h-6"
                >
                  <UserMinus className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </>
            )}
            
            {type === 'request' && (
              <>
                <Button
                  onClick={() => acceptFriendRequest(user.friend_id!)}
                  size="sm"
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Accept
                </Button>
                <Button
                  onClick={() => rejectFriendRequest(user.friend_id!)}
                  size="sm"
                  variant="outline"
                  className="font-pixelated text-xs h-6"
                >
                  <UserMinus className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {type === 'suggested' && (
              <Button
                onClick={() => sendFriendRequest(user.id)}
                size="sm"
                className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs h-6"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Friend
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-3">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted" />
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
      <div className="max-w-4xl mx-auto relative h-[calc(100vh-60px)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="font-pixelated text-base">Friends</h1>
          </div>
          
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 font-pixelated text-xs h-8"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="friends" className="h-[calc(100vh-120px)]">
          <TabsList className="grid w-full grid-cols-3 mx-3 mt-3">
            <TabsTrigger value="friends" className="font-pixelated text-xs relative">
              Friends
              {friends.length > 0 && (
                <Badge variant="secondary\" className="ml-2 h-4 w-4 p-0 text-xs">
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="font-pixelated text-xs relative">
              Requests
              {requests.length > 0 && (
                <Badge variant="destructive\" className="ml-2 h-4 w-4 p-0 text-xs animate-pulse">
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggested" className="font-pixelated text-xs relative">
              Suggested
              {suggested.length > 0 && (
                <Badge variant="outline\" className="ml-2 h-4 w-4 p-0 text-xs">
                  {suggested.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {filterUsers(friends).length > 0 ? (
                <div className="space-y-3 pb-3">
                  {filterUsers(friends).map((friend) => (
                    <UserCard key={friend.id} user={friend} type="friend" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No friends found' : 'No friends yet'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Start connecting with people by sending friend requests!'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {filterUsers(requests).length > 0 ? (
                <div className="space-y-3 pb-3">
                  {filterUsers(requests).map((request) => (
                    <UserCard key={request.id} user={request} type="request" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Clock className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No requests found' : 'No friend requests'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'When people send you friend requests, they\'ll appear here.'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggested" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {filterUsers(suggested).length > 0 ? (
                <div className="space-y-3 pb-3">
                  {filterUsers(suggested).map((suggestion) => (
                    <UserCard key={suggestion.id} user={suggestion} type="suggested" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <UserPlus className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No suggestions found' : 'No suggestions available'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Check back later for new friend suggestions!'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Remove Friend Confirmation Dialog */}
        <AlertDialog open={showRemoveDialog.show} onOpenChange={(open) => setShowRemoveDialog({show: open, friend: null})}>
          <AlertDialogContent className="max-w-md mx-auto animate-in zoom-in-95 duration-200">
            <AlertDialogHeader>
              <div className="flex items-center justify-between">
                <AlertDialogTitle className="font-pixelated text-sm">Remove Friend</AlertDialogTitle>
                <Button
                  onClick={() => setShowRemoveDialog({show: false, friend: null})}
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <AlertDialogDescription className="font-pixelated text-xs">
                Are you sure you want to remove <strong>{showRemoveDialog.friend?.name}</strong> from your friends list? 
                This will also block personal chat access instantly. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showRemoveDialog.friend?.friend_id && removeFriend(showRemoveDialog.friend.friend_id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              >
                Remove Friend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

export default Friends;