import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, User, ArrowLeft, UserX } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isBlocked?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    avatar: string;
  };
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

export function Messages() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        setCurrentUser({
          id: user.id,
          name: userProfile.name || 'User',
          avatar: userProfile.avatar || ''
        });
      }

      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) throw error;
      
      const formattedFriends: Friend[] = [];
      
      if (friendsData) {
        for (const friend of friendsData) {
          const isSender = friend.sender_id === user.id;
          const friendId = isSender ? friend.receiver_id : friend.sender_id;
          
          const { data: friendProfile } = await supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .eq('id', friendId)
            .single();
          
          if (friendProfile && friendProfile.id) {
            formattedFriends.push({
              id: friendProfile.id,
              name: friendProfile.name || 'User',
              username: friendProfile.username || 'guest',
              avatar: friendProfile.avatar || '',
              isBlocked: false
            });
          }
        }
      }

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends for messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFriendsStillConnected = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: friendship } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .single();

      return !!friendship;
    } catch (error) {
      console.log('Friendship check - no longer friends:', error);
      return false;
    }
  };

  const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const messageDate = new Date(message.created_at);
      let dateKey: string;
      
      if (isToday(messageDate)) {
        dateKey = 'Today';
      } else if (isYesterday(messageDate)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(messageDate, 'MMMM d, yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  };

  const fetchMessages = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if still friends before loading messages
      const stillFriends = await checkIfFriendsStillConnected(friendId);
      console.log('Still friends check:', stillFriends, 'for friend:', friendId);
      
      if (!stillFriends) {
        console.log('No longer friends, marking as blocked');
        // Update friend status to blocked
        setFriends(prev => 
          prev.map(f => 
            f.id === friendId ? { ...f, isBlocked: true } : f
          )
        );
        
        // If this friend is currently selected, show blocked message
        if (selectedFriend?.id === friendId) {
          setSelectedFriend(prev => prev ? { ...prev, isBlocked: true } : null);
        }
        return;
      }

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey(name, avatar)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at');
        
      if (error) throw error;

      const formattedMessages: Message[] = messagesData.map((message: any) => ({
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        created_at: message.created_at,
        sender: {
          name: message.profiles?.name || 'Unknown',
          avatar: message.profiles?.avatar || ''
        }
      }));

      setMessages(formattedMessages);
      setMessageGroups(groupMessagesByDate(formattedMessages));
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !currentUser || sendingMessage) return;
    
    // Check if friend is blocked
    if (selectedFriend.isBlocked) {
      toast({
        variant: 'destructive',
        title: 'Cannot send message',
        description: 'You are no longer friends with this user',
      });
      return;
    }

    // Double-check friendship status before sending
    const stillFriends = await checkIfFriendsStillConnected(selectedFriend.id);
    if (!stillFriends) {
      console.log('Friendship ended, blocking chat');
      setSelectedFriend(prev => prev ? { ...prev, isBlocked: true } : null);
      setFriends(prev => 
        prev.map(f => 
          f.id === selectedFriend.id ? { ...f, isBlocked: true } : f
        )
      );
      toast({
        variant: 'destructive',
        title: 'Cannot send message',
        description: 'You are no longer friends with this user',
      });
      return;
    }
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        sender_id: currentUser.id,
        receiver_id: selectedFriend.id,
        content: newMessage.trim(),
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) throw error;

      setNewMessage('');
      
      if (data) {
        const newMessageWithSender = {
          ...data,
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          }
        };
        
        setMessages(prevMessages => {
          const exists = prevMessages.some(msg => msg.id === data.id);
          if (exists) return prevMessages;
          const updatedMessages = [...prevMessages, newMessageWithSender];
          setMessageGroups(groupMessagesByDate(updatedMessages));
          return updatedMessages;
        });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getDateSeparatorText = (date: string) => {
    if (date === 'Today') return 'Today';
    if (date === 'Yesterday') return 'Yesterday';
    return date;
  };

  useEffect(() => {
    fetchFriends();
    
    const friendsInterval = setInterval(() => {
      fetchFriends();
    }, 30000);

    return () => clearInterval(friendsInterval);
  }, []);

  useEffect(() => {
    if (selectedFriend && currentUser) {
      fetchMessages(selectedFriend.id);
      
      const channel = supabase
        .channel(`messages-${selectedFriend.id}-${currentUser.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${currentUser.id}))`
          }, 
          async (payload) => {
            console.log('Real-time message update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as Message;
              
              if (newMessage.sender_id !== currentUser.id) {
                const { data } = await supabase
                  .from('profiles')
                  .select('name, avatar')
                  .eq('id', newMessage.sender_id)
                  .single();
                  
                if (data) {
                  setMessages(prevMessages => {
                    const exists = prevMessages.some(msg => msg.id === newMessage.id);
                    if (exists) return prevMessages;
                    
                    const messageWithSender = {
                      ...newMessage,
                      sender: {
                        name: data.name || 'Unknown',
                        avatar: data.avatar || ''
                      }
                    };
                    
                    const updated = [...prevMessages, messageWithSender];
                    setMessageGroups(groupMessagesByDate(updated));
                    setTimeout(scrollToBottom, 100);
                    return updated;
                  });
                }
              }
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              fetchMessages(selectedFriend.id);
            }
          }
        )
        .subscribe();

      // Listen for friend removals in real-time
      const friendsChannel = supabase
        .channel(`friends-status-${selectedFriend.id}-${currentUser.id}`)
        .on('postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friends'
          },
          (payload) => {
            console.log('Friend deletion detected:', payload);
            // Check if this deletion affects current conversation
            const deletedFriend = payload.old;
            if ((deletedFriend.sender_id === currentUser.id && deletedFriend.receiver_id === selectedFriend.id) ||
                (deletedFriend.sender_id === selectedFriend.id && deletedFriend.receiver_id === currentUser.id)) {
              console.log('Current conversation affected by friend removal');
              // Mark friend as blocked immediately
              setSelectedFriend(prev => prev ? { ...prev, isBlocked: true } : null);
              setFriends(prev => 
                prev.map(f => 
                  f.id === selectedFriend.id ? { ...f, isBlocked: true } : f
                )
              );
            }
          }
        )
        .subscribe();

      const messageInterval = setInterval(() => {
        fetchMessages(selectedFriend.id);
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(friendsChannel);
        clearInterval(messageInterval);
      };
    }
  }, [selectedFriend, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messageGroups]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Friends List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedFriend ? 'hidden md:flex' : ''}`}>
            {/* Friends List Header */}
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-pixelated text-sm font-medium">Messages</h2>
            </div>

            {/* Friends List - Scrollable */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-muted rounded mb-2" />
                        <div className="h-3 w-32 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length > 0 ? (
                <div className="p-2">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => {
                        setSelectedFriend(friend);
                        fetchMessages(friend.id);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                        selectedFriend?.id === friend.id 
                          ? 'bg-accent shadow-md' 
                          : ''
                      } ${friend.isBlocked ? 'opacity-50' : ''}`}
                    >
                      <Avatar className="h-12 w-12 border-2 border-background">
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {friend.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{friend.username}
                          {friend.isBlocked && (
                            <span className="ml-2 text-destructive font-pixelated text-xs">
                              • No longer friends
                            </span>
                          )}
                        </p>
                      </div>
                      {friend.isBlocked && (
                        <UserX className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No friends yet</p>
                  <Button variant="outline" asChild>
                    <a href="/friends">Find Friends</a>
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedFriend ? 'hidden md:flex' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedFriend(null)}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {selectedFriend.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFriend.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{selectedFriend.username}
                      {selectedFriend.isBlocked && (
                        <span className="ml-2 text-destructive font-pixelated">
                          • No longer friends
                        </span>
                      )}
                    </p>
                  </div>
                  {selectedFriend.isBlocked && (
                    <UserX className="h-5 w-5 text-destructive" />
                  )}
                </div>

                {/* Messages Area - Scrollable with proper height */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea 
                    ref={messagesContainerRef}
                    className="h-full p-4"
                  >
                    <div className="space-y-4 pb-4">
                      {selectedFriend.isBlocked && (
                        <div className="text-center py-4">
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
                            <UserX className="h-8 w-8 text-destructive mx-auto mb-2" />
                            <p className="font-pixelated text-sm text-destructive font-medium">
                              You are no longer friends
                            </p>
                            <p className="font-pixelated text-xs text-muted-foreground mt-1">
                              You cannot send or receive messages from this user
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {messageGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-4">
                          {/* Date Separator */}
                          <div className="flex items-center justify-center py-2">
                            <div className="bg-muted px-3 py-1 rounded-full">
                              <p className="font-pixelated text-xs text-muted-foreground">
                                {getDateSeparatorText(group.date)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Messages for this date */}
                          {group.messages.map((message, messageIndex) => (
                            <div 
                              key={message.id}
                              className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex gap-2 max-w-[80%] ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-8 w-8 mt-1">
                                  {message.sender?.avatar ? (
                                    <AvatarImage src={message.sender.avatar} />
                                  ) : (
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {message.sender?.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div 
                                  className={`p-3 rounded-lg ${
                                    message.sender_id === currentUser?.id 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted'
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {formatMessageTime(message.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t bg-background">
                  {selectedFriend.isBlocked ? (
                    <div className="text-center py-2">
                      <p className="font-pixelated text-xs text-muted-foreground">
                        You cannot send messages to this user
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Textarea 
                          placeholder="Type a message..." 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          className="min-h-[45px] max-h-[120px] resize-none"
                          disabled={sendingMessage || selectedFriend.isBlocked}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sendingMessage || selectedFriend.isBlocked}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Press Enter to send, Shift + Enter for new line
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
                <p className="text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Messages;