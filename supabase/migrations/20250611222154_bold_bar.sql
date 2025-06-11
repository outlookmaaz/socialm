/*
  # Fix posts RLS policies and ensure proper visibility handling

  1. Updates
    - Drop and recreate RLS policies for posts table
    - Ensure visibility column exists with proper constraints
    - Add proper indexes for performance
    - Fix policy logic to handle both public and friends-only posts

  2. Security
    - Users can see their own posts regardless of visibility
    - Users can see public posts from anyone
    - Users can see friends-only posts only from their friends
    - Proper insert/update/delete policies for post owners
*/

-- Ensure visibility column exists with proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE posts ADD COLUMN visibility text DEFAULT 'public';
  END IF;
END $$;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'posts_visibility_check'
  ) THEN
    ALTER TABLE posts ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('public', 'friends'));
  END IF;
END $$;

-- Update any NULL visibility values to 'public'
UPDATE posts SET visibility = 'public' WHERE visibility IS NULL;

-- Add index for visibility if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_user_visibility ON posts(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_visibility ON posts(created_at DESC, visibility);

-- Drop all existing policies for posts
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Friends posts are viewable by friends" ON posts;
DROP POLICY IF EXISTS "Own posts are always viewable" ON posts;

-- Create comprehensive RLS policies for posts
-- Policy 1: Users can always see their own posts
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Anyone can see public posts
CREATE POLICY "Anyone can view public posts"
  ON posts FOR SELECT
  TO authenticated
  USING (visibility = 'public');

-- Policy 3: Users can see friends-only posts from their friends
CREATE POLICY "Users can view friends posts from friends"
  ON posts FOR SELECT
  TO authenticated
  USING (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM friends
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
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 6: Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure posts table has proper replica identity for realtime
ALTER TABLE posts REPLICA IDENTITY FULL;

-- Add posts to realtime publication if not already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
  END;
END $$;