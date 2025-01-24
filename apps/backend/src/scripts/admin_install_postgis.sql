-- This script must be run by a superuser/database administrator

-- Install PostGIS extension if not already installed
CREATE EXTENSION IF NOT EXISTS postgis;

-- Grant usage on the PostGIS schema to our application user
GRANT USAGE ON SCHEMA public TO "swoc-uat-ssl-user";

-- Grant execute permission on all current and future PostGIS functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "swoc-uat-ssl-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "swoc-uat-ssl-user";

-- Add geometry columns to our tables
SELECT AddGeometryColumn('provinces', 'geom', 4326, 'POINT', 2);
SELECT AddGeometryColumn('amphures', 'geom', 4326, 'POINT', 2);
SELECT AddGeometryColumn('tumbons', 'geom', 4326, 'POINT', 2);

-- Grant permissions on the geometry columns
GRANT SELECT, INSERT, UPDATE ON provinces TO "swoc-uat-ssl-user";
GRANT SELECT, INSERT, UPDATE ON amphures TO "swoc-uat-ssl-user";
GRANT SELECT, INSERT, UPDATE ON tumbons TO "swoc-uat-ssl-user";

-- Update existing records with geometry data
UPDATE provinces SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
UPDATE amphures SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
UPDATE tumbons SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

-- Create spatial indexes
CREATE INDEX idx_provinces_geom ON provinces USING GIST (geom);
CREATE INDEX idx_amphures_geom ON amphures USING GIST (geom);
CREATE INDEX idx_tumbons_geom ON tumbons USING GIST (geom);

-- Analyze tables for better query planning
ANALYZE provinces;
ANALYZE amphures;
ANALYZE tumbons; 