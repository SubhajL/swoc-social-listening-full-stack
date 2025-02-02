-- Add reply tracking columns to processed_posts table
BEGIN;

-- Add new columns with appropriate defaults
ALTER TABLE processed_posts
  ADD COLUMN IF NOT EXISTS replied_post BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS replied_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS replied_by VARCHAR(255);

-- Update historical data (posts before December 1, 2024)
UPDATE processed_posts
SET 
  replied_post = TRUE,
  replied_date = post_date,  -- Using post_date as replied_date for historical data
  replied_by = 'System Migration'  -- Marking historical updates
WHERE post_date < '2024-12-01';

-- Log the update summary
WITH update_summary AS (
  SELECT COUNT(*) as count
  FROM processed_posts
  WHERE replied_post = TRUE
    AND replied_by = 'System Migration'
)
SELECT format('Total historical posts updated: %s', count) as message
FROM update_summary;

COMMIT; 