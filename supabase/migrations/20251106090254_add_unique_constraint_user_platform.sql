/*
  # Add unique constraint to social_accounts

  1. Changes
    - Add unique constraint on (user_id, platform) to social_accounts table
    - This ensures a user can only have one account per platform
    - Allows upsert operations to work correctly with on_conflict

  2. Security
    - No RLS changes needed
*/

-- Add unique constraint on user_id and platform
ALTER TABLE social_accounts 
ADD CONSTRAINT social_accounts_user_id_platform_key 
UNIQUE (user_id, platform);
