/*
  # Create notifications table and function

  1. New Tables
    - `notifications` (if not exists)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `type` (text, notification type)
      - `content` (text, notification message)
      - `reference_id` (uuid, optional reference to related entity)
      - `read` (boolean, read status)
      - `deleted_at` (timestamp, soft delete)
      - `created_at` (timestamp)

  2. Functions
    - `create_notifications_table_if_not_exists` - Creates table if needed

  3. Security
    - Enable RLS on `notifications` table
    - Add policies for users to manage their own notifications
*/

-- Create function to create notifications table if it doesn't exist
CREATE OR REPLACE FUNCTION create_notifications_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Create notifications table if it doesn't exist
  CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    content text NOT NULL,
    reference_id uuid,
    read boolean DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now()
  );

  -- Enable RLS if not already enabled
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

  -- Create policies if they don't exist
  DO $$
  BEGIN
    -- Check if policies exist before creating them
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'notifications' AND policyname = 'Users can read own notifications'
    ) THEN
      CREATE POLICY "Users can read own notifications"
        ON notifications
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'notifications' AND policyname = 'Users can insert own notifications'
    ) THEN
      CREATE POLICY "Users can insert own notifications"
        ON notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
    ) THEN
      CREATE POLICY "Users can update own notifications"
        ON notifications
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'notifications' AND policyname = 'Users can delete own notifications'
    ) THEN
      CREATE POLICY "Users can delete own notifications"
        ON notifications
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'notifications' AND policyname = 'System can insert notifications'
    ) THEN
      CREATE POLICY "System can insert notifications"
        ON notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
  END $$;

  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at);

  -- Add to realtime publication if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
  END;

  -- Set replica identity
  ALTER TABLE notifications REPLICA IDENTITY FULL;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'Error in create_notifications_table_if_not_exists: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create everything
SELECT create_notifications_table_if_not_exists();