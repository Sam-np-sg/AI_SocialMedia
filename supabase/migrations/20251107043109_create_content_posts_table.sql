/*
  # Create content_posts table for AI-generated drafts
  
  1. New Tables
    - `content_posts`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - Reference to user who created the post
      - `task_name` (text) - Short name/description of the post
      - `content` (text) - The actual post content
      - `platforms` (jsonb) - Array of platform names where post will be published
      - `status` (text) - Current status: draft, scheduled, published, failed
      - `scheduled_for` (timestamptz) - When the post should be published
      - `published_at` (timestamptz) - When the post was actually published
      - `error_message` (text) - Error details if publishing failed
      - `created_at` (timestamptz) - When the draft was created
      - `updated_at` (timestamptz) - When the draft was last modified
  
  2. Security
    - Enable RLS on `content_posts` table
    - Add policies for authenticated users to:
      - View their own drafts
      - Create new drafts
      - Update their own drafts
      - Delete their own drafts
  
  3. Indexes
    - Index on user_id for fast lookups
    - Index on status for filtering
    - Index on scheduled_for for scheduling queries
*/

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

-- Enable RLS
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_posts_user_id ON content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled_for ON content_posts(scheduled_for);

-- RLS Policies
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