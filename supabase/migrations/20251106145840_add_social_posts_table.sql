/*
  # Add Social Media Posts Table

  1. New Tables
    - `social_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `social_account_id` (uuid, foreign key to social_accounts)
      - `platform` (text) - twitter, facebook, instagram, linkedin
      - `post_id` (text) - external post ID from the platform
      - `content` (text) - post text content
      - `media_url` (text) - URL to media if present
      - `media_type` (text) - image, video, carousel, etc.
      - `likes_count` (integer)
      - `comments_count` (integer)
      - `shares_count` (integer)
      - `engagement_rate` (numeric)
      - `posted_at` (timestamptz) - when it was posted on the platform
      - `fetched_at` (timestamptz) - when we fetched it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `social_posts` table
    - Add policy for users to read their own posts
    - Add policy for users to insert their own posts
    - Add policy for users to update their own posts

  3. Indexes
    - Index on user_id for fast lookups
    - Index on social_account_id for filtering by account
    - Index on posted_at for chronological ordering
    - Unique constraint on platform + post_id to prevent duplicates
*/

-- Create social_posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  post_id text NOT NULL,
  content text DEFAULT '',
  media_url text,
  media_type text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  posted_at timestamptz DEFAULT now(),
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate posts
ALTER TABLE social_posts 
ADD CONSTRAINT unique_platform_post_id UNIQUE (platform, post_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_social_account_id ON social_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_posted_at ON social_posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);

-- Enable RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own posts
CREATE POLICY "Users can view own social posts"
  ON social_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own posts
CREATE POLICY "Users can insert own social posts"
  ON social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update own social posts"
  ON social_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete own social posts"
  ON social_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
