-- Update post coordinates from administrative tables
-- This script updates the latitude/longitude of posts that have administrative location data
-- but no coordinates, by using the coordinates from the tumbon/amphure/province tables

-- Start transaction
BEGIN;

-- Create temporary table to store updates
CREATE TEMP TABLE post_updates AS
WITH location_hierarchy AS (
  SELECT 
    pp.processed_post_id,
    COALESCE(
      -- Try tumbon first
      (
        SELECT jsonb_build_object('lat', t.latitude, 'lng', t.longitude, 'source', 'tumbon')
        FROM tumbons t
        WHERE t.name_th = ANY(pp.tumbon)
          AND t.latitude IS NOT NULL 
          AND t.longitude IS NOT NULL
        LIMIT 1
      ),
      -- Then try amphure
      (
        SELECT jsonb_build_object('lat', a.latitude, 'lng', a.longitude, 'source', 'amphure')
        FROM amphures a
        WHERE a.name_th = ANY(pp.amphure)
          AND a.latitude IS NOT NULL 
          AND a.longitude IS NOT NULL
        LIMIT 1
      ),
      -- Finally try province
      (
        SELECT jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'source', 'province')
        FROM provinces p
        WHERE p.name_th = ANY(pp.province)
          AND p.latitude IS NOT NULL 
          AND p.longitude IS NOT NULL
        LIMIT 1
      )
    ) as location_data
  FROM processed_posts pp
  WHERE (pp.latitude IS NULL OR pp.longitude IS NULL)
    AND (
      array_length(pp.tumbon, 1) > 0 OR 
      array_length(pp.amphure, 1) > 0 OR 
      array_length(pp.province, 1) > 0
    )
)
SELECT 
  processed_post_id,
  (location_data->>'lat')::numeric as latitude,
  (location_data->>'lng')::numeric as longitude,
  location_data->>'source' as source
FROM location_hierarchy
WHERE location_data IS NOT NULL;

-- Log the update summary
WITH update_summary AS (
  SELECT 
    source,
    COUNT(*) as count
  FROM post_updates
  GROUP BY source
)
SELECT 'Update summary:' as message
UNION ALL
SELECT format('- %s: %s posts', source, count)
FROM update_summary;

-- Perform the update
UPDATE processed_posts pp
SET 
  latitude = pu.latitude,
  longitude = pu.longitude
FROM post_updates pu
WHERE pp.processed_post_id = pu.processed_post_id;

-- Log the total updates
SELECT format('Total posts updated: %s', COUNT(*))
FROM post_updates;

-- Drop temporary table
DROP TABLE post_updates;

-- Commit transaction
COMMIT; 