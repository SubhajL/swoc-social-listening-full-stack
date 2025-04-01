-- Revert back to boolean columns
ALTER TABLE telemetry_data_stations 
  ADD COLUMN show_daily_report_bool boolean DEFAULT false,
  ADD COLUMN show_hourly_report_bool boolean DEFAULT false;

-- Convert string values back to boolean
UPDATE telemetry_data_stations 
SET show_daily_report_bool = (show_daily_report = '1'),
    show_hourly_report_bool = (show_hourly_report = '1');

-- Drop the string columns
ALTER TABLE telemetry_data_stations 
  DROP COLUMN show_daily_report,
  DROP COLUMN show_hourly_report;

-- Rename bool columns to final names
ALTER TABLE telemetry_data_stations 
  RENAME COLUMN show_daily_report_bool TO show_daily_report;

ALTER TABLE telemetry_data_stations 
  RENAME COLUMN show_hourly_report_bool TO show_hourly_report; 