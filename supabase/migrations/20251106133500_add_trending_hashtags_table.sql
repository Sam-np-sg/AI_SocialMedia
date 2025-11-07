/*
  # Add Trending Hashtags Table

  1. New Tables
    - `trending_hashtags`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `hashtag` (text) - The hashtag without the # symbol
      - `posts_count` (integer) - Number of posts using this hashtag
      - `growth_rate` (numeric) - Percentage growth rate
      - `platform` (text) - Social platform (twitter, linkedin, instagram, facebook, all)
      - `trending_url` (text) - URL to the trending hashtag page on the platform
      - `last_updated` (timestamptz) - When this data was last updated
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `trending_hashtags` table
    - Add policies for users to manage their own trending hashtags data

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on hashtag for search
    - Add index on platform for filtering
*/

-- Create trending_hashtags table
CREATE TABLE IF NOT EXISTS trending_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hashtag text NOT NULL,
  posts_count integer DEFAULT 0,
  growth_rate numeric(5,2) DEFAULT 0.00,
  platform text NOT NULL DEFAULT 'all',
  trending_url text,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_user_id ON trending_hashtags(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_hashtag ON trending_hashtags(hashtag);
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_platform ON trending_hashtags(platform);

-- Enable RLS
ALTER TABLE trending_hashtags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own trending hashtags"
  ON trending_hashtags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trending hashtags"
  ON trending_hashtags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trending hashtags"
  ON trending_hashtags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trending hashtags"
  ON trending_hashtags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
