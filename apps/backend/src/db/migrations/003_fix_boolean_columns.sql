-- Fix boolean columns in telemetry_data_stations table
ALTER TABLE telemetry_data_stations
  ALTER COLUMN use_msl TYPE boolean USING CASE 
    WHEN use_msl IS NULL THEN false
    WHEN use_msl = '1' THEN true
    WHEN use_msl = '0' THEN false
    ELSE false
  END,
  ALTER COLUMN use_q_auto TYPE boolean USING CASE 
    WHEN use_q_auto IS NULL THEN false
    WHEN use_q_auto = '1' THEN true
    WHEN use_q_auto = '0' THEN false
    ELSE false
  END,
  ALTER COLUMN show_hourly_report TYPE boolean USING CASE 
    WHEN show_hourly_report IS NULL THEN false
    WHEN show_hourly_report = '1' THEN true
    WHEN show_hourly_report = '0' THEN false
    ELSE false
  END,
  ALTER COLUMN show_daily_report TYPE boolean USING CASE 
    WHEN show_daily_report IS NULL THEN false
    WHEN show_daily_report = '1' THEN true
    WHEN show_daily_report = '0' THEN false
    ELSE false
  END,
  ALTER COLUMN is_warning TYPE boolean USING CASE 
    WHEN is_warning IS NULL THEN false
    WHEN is_warning = '1' THEN true
    WHEN is_warning = '0' THEN false
    ELSE false
  END,
  ALTER COLUMN has_data TYPE boolean USING CASE 
    WHEN has_data IS NULL THEN true
    WHEN has_data = '1' THEN true
    WHEN has_data = '0' THEN false
    ELSE true
  END;

-- Set default values for boolean columns
ALTER TABLE telemetry_data_stations
  ALTER COLUMN use_msl SET DEFAULT false,
  ALTER COLUMN use_q_auto SET DEFAULT false,
  ALTER COLUMN show_hourly_report SET DEFAULT false,
  ALTER COLUMN show_daily_report SET DEFAULT false,
  ALTER COLUMN is_warning SET DEFAULT false,
  ALTER COLUMN has_data SET DEFAULT true;

-- Add NOT NULL constraints where appropriate
ALTER TABLE telemetry_data_stations
  ALTER COLUMN is_warning SET NOT NULL,
  ALTER COLUMN has_data SET NOT NULL; 