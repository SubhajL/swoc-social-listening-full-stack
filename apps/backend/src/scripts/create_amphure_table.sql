-- Create amphure table with PostGIS geometry column
-- This table is specifically designed for the ThaiWater service

-- Drop the table if it exists
DROP TABLE IF EXISTS amphure;

-- Create the table with required columns
CREATE TABLE amphure (
  id SERIAL PRIMARY KEY,
  amphure_name VARCHAR(100) NOT NULL,
  province_name VARCHAR(100) NOT NULL,
  
  -- Administrative information
  amphure_code VARCHAR(4),
  province_code VARCHAR(2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_amphure_amphure_name ON amphure(amphure_name);
CREATE INDEX idx_amphure_province_name ON amphure(province_name);

-- Add PostGIS geometry column for polygon boundaries
-- This requires PostGIS extension to be installed
SELECT AddGeometryColumn('amphure', 'geom', 4326, 'POLYGON', 2);

-- Create a spatial index for faster spatial queries
CREATE INDEX idx_amphure_geom ON amphure USING GIST(geom);

-- Add a comment explaining the table's purpose
COMMENT ON TABLE amphure IS 'Contains amphure (district) boundaries for spatial queries in the ThaiWater service';

-- Example of how to populate the table (to be replaced with actual data)
-- INSERT INTO amphure (amphure_name, province_name, amphure_code, province_code, geom)
-- VALUES (
--   'เมืองเชียงใหม่',
--   'เชียงใหม่',
--   '5001',
--   '50',
--   ST_GeomFromText('POLYGON((98.9 18.7, 99.1 18.7, 99.1 18.9, 98.9 18.9, 98.9 18.7))', 4326)
-- );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_amphure_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the timestamp
CREATE TRIGGER update_amphure_timestamp
BEFORE UPDATE ON amphure
FOR EACH ROW
EXECUTE FUNCTION update_amphure_timestamp();

-- Add a migration script to populate this table from existing amphures table
-- This assumes the amphures table exists and has latitude/longitude points
-- 
-- INSERT INTO amphure (amphure_name, province_name, amphure_code, province_code)
-- SELECT 
--   name_th AS amphure_name,
--   (SELECT name_th FROM provinces WHERE id = province_id) AS province_name,
--   id AS amphure_code,
--   province_id AS province_code
-- FROM amphures;
--
-- -- Create buffer polygons around the points (this is a simplification)
-- -- In a real implementation, you would import actual boundary polygons
-- UPDATE amphure a
-- SET geom = ST_Buffer(
--   ST_SetSRID(
--     ST_MakePoint(
--       (SELECT longitude FROM amphures WHERE id = a.amphure_code),
--       (SELECT latitude FROM amphures WHERE id = a.amphure_code)
--     ),
--     4326
--   ),
--   0.05 -- Approximately 5km buffer
-- ); 