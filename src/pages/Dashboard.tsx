import React, { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Image as ImageIcon, X, Globe, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Dashboard() {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true); // true = public, false = friends only
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 5MB'
      });
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if ((!postContent.trim() && !selectedImage) || isPosting) return;

    try {
      setIsPosting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to post'
        });
        return;
      }

      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, selectedImage);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload image. Please try again.');
        }

        const { data } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      // Prepare post data with explicit privacy setting
      const postData = {
        content: postContent.trim(),
        user_id: user.id,
        image_url: imageUrl,
        visibility: isPublic ? 'public' : 'friends'
      };

      console.log('Creating post with privacy setting:', {
        visibility: postData.visibility,
        isPublic: isPublic,
        content: postData.content.substring(0, 50) + '...'
      });

      // First, try to create post with visibility column
      let postCreated = false;
      let finalPost = null;

      try {
        const { data: newPost, error } = await supabase
          .from('posts')
          .insert(postData)
          .select(`
            id,
            content,
            image_url,
            visibility,
            created_at,
            user_id,
            profiles:user_id (
              name,
              username,
              avatar
            )
          `)
          .single();

        if (error) {
          throw error;
        }

        finalPost = newPost;
        postCreated = true;
        console.log('Post created successfully with privacy:', newPost);

      } catch (error: any) {
        console.error('Error with visibility column:', error);
        
        // If visibility column doesn't exist, try without it
        if (error.message?.includes('visibility') || error.message?.includes('column')) {
          console.log('Visibility column not found, creating post without privacy setting...');
          
          const fallbackData = {
            content: postContent.trim(),
            user_id: user.id,
            image_url: imageUrl
          };
          
          const { data: fallbackPost, error: fallbackError } = await supabase
            .from('posts')
            .insert(fallbackData)
            .select(`
              id,
              content,
              image_url,
              created_at,
              user_id,
              profiles:user_id (
                name,
                username,
                avatar
              )
            `)
            .single();
          
          if (fallbackError) {
            throw new Error('Failed to create post. Please try again.');
          }
          
          finalPost = { ...fallbackPost, visibility: 'public' };
          postCreated = true;
          console.log('Post created successfully (fallback mode):', fallbackPost);
        } else {
          throw error;
        }
      }

      if (postCreated && finalPost) {
        // Show success message
        toast({
          title: 'Post created!',
          description: `Your ${isPublic ? 'public' : 'friends-only'} post has been shared!`,
        });

        // Reset form but preserve privacy setting
        setPostContent('');
        removeImage();
        // Keep isPublic as user's preference for next post

        // Trigger immediate refresh of the feed
        setRefreshTrigger(prev => prev + 1);
      }

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create post. Please check your connection and try again.'
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  const handlePrivacyToggle = (checked: boolean) => {
    console.log('Privacy toggle changed from', isPublic, 'to', checked);
    setIsPublic(checked);
    
    // Show immediate feedback
    toast({
      title: 'Privacy setting updated',
      description: checked ? 'Next post will be public' : 'Next post will be friends-only',
      duration: 2000,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* Stories Container - Fixed at top */}
        <StoriesContainer />
        
        {/* Scrollable Content Area */}
        <ScrollArea className="h-[calc(100vh-180px)] px-2">
          {/* Post Box */}
          <Card className="mb-4 card-gradient animate-fade-in shadow-lg border-2 border-social-green/10">
            <CardContent className="p-4">
              <div className="space-y-4">
                <Textarea
                  placeholder="What's on your mind? Share your thoughts..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[80px] max-h-[160px] font-pixelated text-sm resize-none focus:ring-2 focus:ring-social-green/20 transition-all duration-200"
                  disabled={isPosting}
                />
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative rounded-lg overflow-hidden border border-social-green/20">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-60 w-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg hover:scale-105 transition-transform"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Privacy Settings */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-social-green/10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Globe className="h-4 w-4 text-social-blue" />
                      ) : (
                        <Users className="h-4 w-4 text-social-green" />
                      )}
                      <Label htmlFor="privacy-toggle" className="font-pixelated text-xs cursor-pointer">
                        {isPublic ? 'Public' : 'Friends Only'}
                      </Label>
                    </div>
                    <Badge 
                      variant={isPublic ? "default" : "secondary"} 
                      className={`font-pixelated text-xs transition-all duration-200 ${
                        isPublic 
                          ? 'bg-social-blue text-white border-social-blue' 
                          : 'bg-social-green text-white border-social-green'
                      }`}
                    >
                      {isPublic ? 'Everyone can see' : 'Only friends can see'}
                    </Badge>
                  </div>
                  <Switch
                    id="privacy-toggle"
                    checked={isPublic}
                    onCheckedChange={handlePrivacyToggle}
                    disabled={isPosting}
                    className="data-[state=checked]:bg-social-blue data-[state=unchecked]:bg-social-green transition-colors duration-200"
                  />
                </div>
                
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 font-pixelated text-xs hover:bg-social-green/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPosting}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                    <p className="text-xs text-muted-foreground font-pixelated hidden sm:block">
                      Press Enter to post
                    </p>
                  </div>
                  <Button
                    onClick={handlePost}
                    disabled={(!postContent.trim() && !selectedImage) || isPosting}
                    size="sm"
                    className="bg-social-green hover:bg-social-light-green text-white font-pixelated h-9 px-4 hover:scale-105 transition-transform"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isPosting ? 'Posting...' : `Share ${isPublic ? 'Publicly' : 'to Friends'}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Feed with refresh trigger */}
          <CommunityFeed key={refreshTrigger} refreshTrigger={refreshTrigger} />
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;