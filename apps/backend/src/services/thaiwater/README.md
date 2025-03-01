# ThaiWater API Integration

This service integrates with the ThaiWater API to fetch and store rainfall data from multiple sources.

## Database Schema

The service uses two main tables:

1. `thaiwater_tele_stations` - Stores information about telemetry stations
   - `tele_station_id` (Primary Key)
   - `tele_station_name`
   - `tele_station_name_th`
   - `tele_station_oldcode`
   - `tele_station_lat`
   - `tele_station_long`
   - `agency_id`
   - `data_source` - Indicates the data source ('HII' or 'TMD')
   - `province`
   - `amphoe`
   - `tambon`
   - Other metadata fields

2. `thaiwater_rainfall_data` - Stores rainfall measurements
   - `id` (Primary Key)
   - `tele_station_id` (Foreign Key to thaiwater_tele_stations)
   - `rainfall24h` - Rainfall in the last 24 hours (mm)
   - `rainfall3h` - Rainfall in the last 3 hours (mm, TMD data only)
   - `rainfall_datetime` - Timestamp of the measurement
   - `data_source` - Indicates the data source ('HII' or 'TMD')
   - Other measurement fields

## Current Data Status

As of February 28, 2025:

### Telemetry Stations
- Total stations: 2646
  - HII stations: 1352
  - TMD stations: 1294

### Rainfall Data
- Total rainfall records: 695
  - HII records: 572
  - TMD records: 123

### Highest Rainfall Measurements
- HII: Sato (อบต.สะตอ) - 85.60 mm/24h
- TMD: Umphang - 13.60 mm/24h

## API Endpoints

- `GET /api/thaiwater/stations` - Get all telemetry stations
  - Query parameters:
    - `data_source` - Filter by data source ('HII' or 'TMD')
    - `province` - Filter by province
    - `limit` - Limit the number of results
    - `offset` - Offset for pagination

- `GET /api/thaiwater/rainfall` - Get rainfall data
  - Query parameters:
    - `data_source` - Filter by data source ('HII' or 'TMD')
    - `date` - Filter by date (YYYY-MM-DD)
    - `min_rainfall` - Filter by minimum rainfall amount
    - `limit` - Limit the number of results
    - `offset` - Offset for pagination

## Scripts

The following scripts are available for managing ThaiWater data:

### HII Data
- `src/scripts/fetch-thaiwater-rainfall.mjs` - Fetch rainfall data from HII API
- `src/scripts/insert-thaiwater-rainfall-data.mjs` - Insert HII rainfall data into database

### TMD Data
- `src/scripts/sync-tmd-data.mjs` - Fetch and sync TMD station and rainfall data
- `src/scripts/check-tmd-data.mjs` - Check TMD data in the database

### Analysis
- `src/scripts/analyze-rainfall-data.mjs` - Analyze rainfall data distribution

## Scheduled Tasks

- Daily sync of HII rainfall data at 12:00 UTC
- Daily sync of TMD rainfall data at 12:30 UTC

## Setup

1. Ensure the database tables are created (see `src/db/migrations`)
2. Run the migration script to add TMD support:
   ```
   node src/scripts/modify-thaiwater-tables-for-tmd.mjs
   ```
3. Run the initial data sync:
   ```
   node src/scripts/insert-thaiwater-rainfall-data.mjs
   node src/scripts/sync-tmd-data.mjs
   ```

## Usage Example

```javascript
import { getRainfallData } from '../services/thaiwater/rainfall.service';

// Get rainfall data
const rainfallData = await getRainfallData({
  date: '2025-02-28',
  minRainfall: 10,
  dataSource: 'HII'
});

console.log(`Found ${rainfallData.length} stations with rainfall > 10mm`);
``` 