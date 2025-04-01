-- First convert existing values to temporary text columns
ALTER TABLE telemetry_data_stations 
  ADD COLUMN show_daily_report_temp VARCHAR(1),
  ADD COLUMN show_hourly_report_temp VARCHAR(1);

-- Convert existing boolean values to '1'/'0' strings in temp columns
UPDATE telemetry_data_stations 
SET show_daily_report_temp = CASE WHEN show_daily_report THEN '1' ELSE '0' END,
    show_hourly_report_temp = CASE WHEN show_hourly_report THEN '1' ELSE '0' END;

-- Drop the original boolean columns
ALTER TABLE telemetry_data_stations 
  DROP COLUMN show_daily_report,
  DROP COLUMN show_hourly_report;

-- Rename temp columns to final names
ALTER TABLE telemetry_data_stations 
  RENAME COLUMN show_daily_report_temp TO show_daily_report;

ALTER TABLE telemetry_data_stations 
  RENAME COLUMN show_hourly_report_temp TO show_hourly_report;

-- Set default values to '0' (false)
ALTER TABLE telemetry_data_stations 
  ALTER COLUMN show_daily_report SET DEFAULT '0',
  ALTER COLUMN show_hourly_report SET DEFAULT '0'; 