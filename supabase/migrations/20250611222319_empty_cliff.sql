/*
  # Fix Posts Visibility Column and Policies

  1. Schema Updates
    - Ensure visibility column exists on posts table
    - Add proper constraints and defaults
    - Update existing posts to have visibility

  2. RLS Policies
    - Create comprehensive policies for post visibility
    - Ensure users can see their own posts
    - Handle public vs friends-only posts correctly

  3. Indexes
    - Add performance indexes for visibility queries
*/

-- First, ensure the visibility column exists
DO $$
BEGIN
  -- Check if visibility column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'visibility'
  ) THEN
    -- Add visibility column with default value
    ALTER TABLE public.posts ADD COLUMN visibility text DEFAULT 'public';
    
    -- Update all existing posts to be public
    UPDATE public.posts SET visibility = 'public' WHERE visibility IS NULL;
    
    -- Make the column NOT NULL
    ALTER TABLE public.posts ALTER COLUMN visibility SET NOT NULL;
  END IF;
END $$;

-- Add constraint to ensure only valid values
DO $$
BEGIN
  -- Drop constraint if it exists to recreate it
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'posts'
    AND constraint_name = 'posts_visibility_check'
  ) THEN
    ALTER TABLE public.posts DROP CONSTRAINT posts_visibility_check;
  END IF;
  
  -- Add the constraint
  ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check 
    CHECK (visibility IN ('public', 'friends'));
END $$;

-- Update any NULL visibility values to 'public'
UPDATE public.posts SET visibility = 'public' WHERE visibility IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_user_visibility ON public.posts(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_visibility ON public.posts(created_at DESC, visibility);

-- Drop ALL existing policies for posts to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'posts' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.posts';
    END LOOP;
END $$;

-- Create comprehensive RLS policies for posts

-- Policy 1: Users can always see their own posts (regardless of visibility)
CREATE POLICY "Users can view own posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Anyone can see public posts from any user
CREATE POLICY "Anyone can view public posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (visibility = 'public');

-- Policy 3: Users can see friends-only posts from their friends
CREATE POLICY "Users can view friends posts from friends"
  ON public.posts FOR SELECT
  TO authenticated
  USING (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.friends
      WHERE status = 'accepted'
      AND (
        (sender_id = auth.uid() AND receiver_id = posts.user_id)
        OR
        (sender_id = posts.user_id AND receiver_id = auth.uid())
      )
    )
  );

-- Policy 4: Users can insert their own posts
CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 6: Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure posts table has proper replica identity for realtime
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';