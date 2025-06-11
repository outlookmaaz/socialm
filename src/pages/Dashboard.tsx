import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Dashboard() {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const postBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Listen for scroll to top event with improved implementation
  useEffect(() => {
    const handleScrollToTop = () => {
      console.log('Scroll to top event received');
      if (scrollAreaRef.current) {
        // Scroll to the very top of the scroll area
        scrollAreaRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        console.log('Scrolled to top');
      }
    };

    // Listen for both custom event and direct function call
    window.addEventListener('scrollToTop', handleScrollToTop);
    
    // Also expose function globally for direct access
    (window as any).scrollDashboardToTop = handleScrollToTop;
    
    return () => {
      window.removeEventListener('scrollToTop', handleScrollToTop);
      delete (window as any).scrollDashboardToTop;
    };
  }, []);

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

  const resetForm = () => {
    setPostContent('');
    removeImage();
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          content: postContent.trim(),
          user_id: user.id,
          image_url: imageUrl
        });

      if (error) throw error;

      // Reset form immediately for better UX
      resetForm();
      
      toast({
        title: 'Success',
        description: 'Your post has been shared!',
        duration: 3000,
      });

      // Note: The post will appear automatically via real-time subscription
      // No need to manually refresh or fetch posts
      
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create post'
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

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostContent(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* Stories Container - Fixed at top */}
        <StoriesContainer />
        
        {/* Scrollable Content Area */}
        <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-180px)] px-2">
          {/* Post Box */}
          <Card ref={postBoxRef} className="mb-4 card-gradient animate-fade-in shadow-lg border-2 border-social-green/10">
            <CardContent className="p-4">
              <div className="space-y-4">
                <Textarea
                  ref={textareaRef}
                  placeholder="What's on your mind? Share your thoughts..."
                  value={postContent}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[80px] max-h-[160px] font-pixelated text-sm resize-none focus:ring-2 focus:ring-social-green/20 transition-all duration-200"
                  disabled={isPosting}
                  autoComplete="off"
                  style={{ height: 'auto' }}
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
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg hover:scale-105 transition-transform"
                      onClick={removeImage}
                      disabled={isPosting}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
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
                    className={`bg-social-green hover:bg-social-light-green text-white font-pixelated h-9 px-4 transition-all duration-200 ${
                      (postContent.trim() || selectedImage) && !isPosting ? 'scale-110 shadow-lg' : ''
                    }`}
                  >
                    <Send className={`h-4 w-4 mr-2 ${isPosting ? 'animate-pulse' : ''}`} />
                    {isPosting ? 'Posting...' : 'Share Post'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Feed */}
          <CommunityFeed />
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;