-- Migration: Remove redundant reservoir_name_ column
-- Description: This migration removes the unused reservoir_name_ column from the reservoir_locations table

-- Remove the redundant column
ALTER TABLE reservoir_locations DROP COLUMN IF EXISTS reservoir_name_;

-- Add a comment to document the change
COMMENT ON TABLE reservoir_locations IS 'Table storing reservoir location data. The reservoir_name_ column was removed as it was redundant and always null.'; 