-- Create telemetry_data_stations_backup table
CREATE TABLE IF NOT EXISTS telemetry_data_stations_backup (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(255) NOT NULL,
    hydro_id VARCHAR(50) NOT NULL,
    data_source VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    station_code VARCHAR(50),
    hydro_name VARCHAR(255),
    basin_id INTEGER,
    basin_name VARCHAR(255),
    province_code INTEGER,
    brae_level DECIMAL(10, 2),
    q_max DECIMAL(10, 2),
    use_msl INTEGER,
    use_msl_string VARCHAR(50),
    order_no INTEGER,
    station_detail TEXT,
    zero_gauge DECIMAL(10, 2),
    ground_level DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create telemetry_data_backup table
CREATE TABLE IF NOT EXISTS telemetry_data_backup (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL REFERENCES telemetry_data_stations_backup(station_id),
    reading_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reading_time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    water_level DECIMAL(10, 2),
    water_level_above DECIMAL(10, 2),
    flow_rate DECIMAL(10, 2),
    average_flow_rate DECIMAL(10, 2),
    notation_id INTEGER,
    notation_string TEXT,
    source VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_id, reading_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_telemetry_data_stations_backup_hydro_id ON telemetry_data_stations_backup(hydro_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_data_backup_station_id ON telemetry_data_backup(station_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_data_backup_reading_time ON telemetry_data_backup(reading_time);

-- Create trigger for telemetry_data_stations_backup
CREATE TRIGGER update_telemetry_data_stations_backup_updated_at
    BEFORE UPDATE ON telemetry_data_stations_backup
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 