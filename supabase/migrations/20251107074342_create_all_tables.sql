/*
  # Create Complete Social Media Automation Schema

  ## Overview
  This migration creates all necessary tables for the social media automation platform including user profiles, social accounts, posts, analytics, AI suggestions, trending hashtags, content posts, and social posts.

  ## 1. New Tables

  ### `profiles`
  User profile information linked to auth.users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### `social_accounts`
  Connected social media accounts
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - References profiles table
  - `platform` (text) - twitter, facebook, instagram, linkedin
  - `account_name` (text) - Display name on platform
  - `account_handle` (text) - Username/handle
  - `access_token` (text) - OAuth access token
  - `refresh_token` (text) - OAuth refresh token
  - `token_expires_at` (timestamptz) - Token expiration
  - `is_connected` (boolean) - Connection status
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `posts`
  Scheduled and published posts
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References profiles
  - `social_account_id` (uuid) - References social_accounts
  - `content` (text) - Post content
  - `media_urls` (jsonb) - Array of media URLs
  - `platform` (text) - Target platform
  - `status` (text) - draft, scheduled, published, failed
  - `scheduled_for` (timestamptz)
  - `published_at` (timestamptz)
  - `post_id_on_platform` (text) - External platform ID
  - `error_message` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `content_posts`
  AI-generated draft posts
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References auth.users
  - `task_name` (text) - Short description
  - `content` (text) - Post content
  - `platforms` (jsonb) - Target platforms array
  - `status` (text) - draft, scheduled, published, failed
  - `scheduled_for` (timestamptz)
  - `published_at` (timestamptz)
  - `error_message` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `social_posts`
  Posts fetched from social media platforms
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References auth.users
  - `social_account_id` (uuid) - References social_accounts
  - `platform` (text)
  - `post_id` (text) - External platform post ID
  - `content` (text)
  - `media_url` (text)
  - `media_type` (text)
  - `likes_count` (integer)
  - `comments_count` (integer)
  - `shares_count` (integer)
  - `engagement_rate` (numeric)
  - `posted_at` (timestamptz)
  - `fetched_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `analytics`
  Performance analytics for posts
  - `id` (uuid, primary key)
  - `post_id` (uuid) - References posts (nullable)
  - `user_id` (uuid) - References auth.users
  - `social_account_id` (uuid) - References social_accounts (nullable)
  - `platform` (text)
  - `impressions` (integer)
  - `views` (integer)
  - `likes` (integer)
  - `comments` (integer)
  - `shares` (integer)
  - `clicks` (integer)
  - `engagement_rate` (numeric)
  - `collected_at` (timestamptz)
  - `recorded_at` (timestamptz)
  - `created_at` (timestamptz)

  ### `trending_hashtags`
  Trending hashtags across platforms
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References auth.users
  - `hashtag` (text) - Hashtag without # symbol
  - `posts_count` (integer)
  - `growth_rate` (numeric)
  - `platform` (text)
  - `trending_url` (text) - Platform URL
  - `last_updated` (timestamptz)
  - `created_at` (timestamptz)

  ### `ai_suggestions`
  AI-powered content suggestions
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References profiles
  - `suggestion_type` (text) - content, hashtags, best_time, caption_improvement
  - `title` (text)
  - `content` (text)
  - `metadata` (jsonb)
  - `is_applied` (boolean)
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
  - Authenticated access required

  ## 3. Indexes
  - Performance indexes on foreign keys and frequently queried columns

  ## 4. Triggers
  - Auto-update timestamps
  - Auto-create profiles on user signup
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create social_accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin')),
  account_name text NOT NULL DEFAULT '',
  account_handle text NOT NULL DEFAULT '',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_connected boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  media_urls jsonb DEFAULT '[]'::jsonb,
  platform text NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  post_id_on_platform text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content_posts table
CREATE TABLE IF NOT EXISTS content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  content text NOT NULL,
  platforms jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'published', 'failed'))
);

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

-- Create analytics table (modified to support demo data without post_id)
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin', 'all')),
  impressions integer DEFAULT 0,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  clicks integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0.00,
  collected_at timestamptz DEFAULT now(),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

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

-- Create ai_suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('content', 'hashtags', 'best_time', 'caption_improvement')),
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Add unique constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_platform'
  ) THEN
    ALTER TABLE social_accounts ADD CONSTRAINT unique_user_platform UNIQUE (user_id, platform);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_platform_post_id'
  ) THEN
    ALTER TABLE social_posts ADD CONSTRAINT unique_platform_post_id UNIQUE (platform, post_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_social_account_id ON posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_posts_user_id ON content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled_for ON content_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_social_account_id ON social_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_posted_at ON social_posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_user_id ON trending_hashtags(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_hashtag ON trending_hashtags(hashtag);
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_platform ON trending_hashtags(platform);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for social_accounts table
CREATE POLICY "Users can view own social accounts"
  ON social_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts"
  ON social_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON social_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON social_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for posts table
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for content_posts table
CREATE POLICY "Users can view own content posts"
  ON content_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content posts"
  ON content_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content posts"
  ON content_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own content posts"
  ON content_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for social_posts table
CREATE POLICY "Users can view own social posts"
  ON social_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social posts"
  ON social_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for analytics table
CREATE POLICY "Users can view own analytics"
  ON analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics"
  ON analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics"
  ON analytics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for trending_hashtags table
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

-- RLS Policies for ai_suggestions table
CREATE POLICY "Users can view own suggestions"
  ON ai_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions"
  ON ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON ai_suggestions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions"
  ON ai_suggestions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON social_accounts;
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_posts_updated_at ON content_posts;
CREATE TRIGGER update_content_posts_updated_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_posts_updated_at ON social_posts;
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();