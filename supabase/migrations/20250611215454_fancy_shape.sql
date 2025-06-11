/*
  # Add post privacy feature

  1. Changes
    - Add `visibility` column to posts table (public/friends)
    - Add index for better performance
    - Update RLS policies to respect privacy settings

  2. Security
    - Update RLS policies to show only appropriate posts based on visibility
    - Friends-only posts only visible to friends and post owner
    - Public posts visible to all authenticated users
*/

-- Add visibility column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE posts ADD COLUMN visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'friends'));
  END IF;
END $$;

-- Add index for visibility
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);

-- Drop existing RLS policies for posts to recreate them
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create new RLS policies that respect privacy settings
CREATE POLICY "Users can view posts based on privacy"
  ON posts FOR SELECT
  TO authenticated
  USING (
    -- User can see their own posts
    auth.uid() = user_id
    OR
    -- User can see public posts
    visibility = 'public'
    OR
    -- User can see friends-only posts if they are friends with the author
    (
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
    )
  );

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);