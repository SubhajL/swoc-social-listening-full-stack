# ThaiWater Location Data Population

This directory contains scripts for populating administrative location data (province, amphure, tambon) for ThaiWater telemetry stations.

## Overview

The location data population process consists of the following steps:

1. **Set up PostGIS for ThaiWater stations** - Adds a geometry column to the ThaiWater stations table and creates spatial indexes.
2. **Import Thailand administrative boundaries** - Imports GeoJSON files containing Thailand's administrative boundaries into the database.
3. **Populate ThaiWater stations with location data** - Uses a hybrid approach to populate the administrative location data:
   - First attempt: Use PostGIS spatial join if available
   - Second attempt: Use Google Maps API for remaining stations
4. **Schedule regular updates** - Sets up a scheduler to run the location population process on a regular basis.

## Scripts

### 1. Setup PostGIS for ThaiWater Stations

```bash
npx ts-node src/scripts/setup-postgis-for-thaiwater.ts
```

This script:
- Enables the PostGIS extension if not already enabled
- Adds a geometry column to the `thaiwater_tele_stations` table
- Populates the geometry column with points derived from latitude and longitude
- Creates a spatial index on the geometry column
- Creates a trigger to keep the geometry in sync with latitude and longitude updates

### 2. Import Thailand Administrative Boundaries

```bash
npx ts-node src/scripts/import-thailand-boundaries.ts
```

This script:
- Creates tables for provinces, amphures, and tambons
- Imports GeoJSON data into the tables
- Creates spatial indexes for efficient queries

**Note:** You need to have GeoJSON files for Thailand's administrative boundaries in the `data/boundaries` directory:
- `thailand-provinces.geojson`
- `thailand-amphures.geojson`
- `thailand-tambons.geojson`

### 3. Populate ThaiWater Stations with Location Data

```bash
npx ts-node src/scripts/populate-thaiwater-locations.ts [--limit=N] [--new-only]
```

Options:
- `--limit=N`: Limit the number of stations to process (for testing)
- `--new-only`: Only process stations without location data

This script:
- First attempts to use PostGIS spatial join if available
- Then uses Google Maps API for remaining stations
- Generates a report of stations still missing location data

### 4. Run the Complete Location Update Process

```bash
npx ts-node src/scripts/run-location-update.ts [options]
```

Options:
- `--skip-postgis` or `-p`: Skip PostGIS setup
- `--skip-boundaries` or `-b`: Skip Thailand boundaries import
- `--limit=N` or `-l N`: Limit the number of stations to process
- `--new-only` or `-n`: Only process stations without location data
- `--help` or `-h`: Show help

This script runs the entire location update process in sequence.

### 5. Schedule Regular Updates

```bash
npx ts-node src/scripts/schedule-location-updates.ts
```

This script:
- Schedules a weekly full update (Sunday at 1:00 AM)
- Schedules a daily check for new stations (2:00 AM)

## Environment Variables

Make sure you have the following environment variables set:

- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_MAPS_API_KEY`: Google Maps API key for reverse geocoding

## Dependencies

- PostGIS extension for PostgreSQL
- Node.js packages:
  - `pg` - PostgreSQL client
  - `dotenv` - Environment variables
  - `node-cron` - Scheduling
  - `yargs` - Command-line argument parsing

## Data Flow

1. ThaiWater stations with coordinates but no administrative location data are identified
2. If PostGIS and Thailand administrative boundaries are available, a spatial join is performed
3. For remaining stations, the Google Maps API is used for reverse geocoding
4. The results are stored in the `province`, `amphure`, and `tambon` columns of the `thaiwater_tele_stations` table

## Maintenance

- The scheduler runs automatically to keep the location data up to date
- You can manually run the scripts as needed
- Check the logs for any errors or warnings

# Weather Data Sync Scripts

This directory contains scripts for syncing weather data from various Thai government weather APIs to the SWOC database.

## Available Scripts

- `thaiwater-sync.mjs` - Syncs rainfall data from ThaiWater (Hydro-Informatics Institute)
- `tmd-sync.mjs` - Syncs weather and rainfall data from Thailand Meteorological Department (TMD)
- `test-api-connections.mjs` - Tests connections to all weather APIs
- `sync-hii-data.mjs` - Syncs rainfall data from ThaiWater/HII (Hydro-Informatics Institute)

## Environment Variables

The scripts require the following environment variables to be set in the `.env` file:

### Database Connection
```
DB_HOST=your-db-host
DB_PORT=your-db-port
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true
```

### TMD API Credentials
```
TMD_API_KEY=your-tmd-api-key
TMD_API_SECRET=your-tmd-api-secret
```

## API Endpoints

### ThaiWater (Hydro-Informatics Institute)
- Base URL: `https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service`
- Authentication: URL parameters `mid` and `eid` (encoded ID)
- Endpoints:
  - Rainfall Stations: Uses MID=105 and a specific EID
  - Rainfall Data: Uses MID=98 and a specific EID with optional `start_date` parameter

### TMD (Thailand Meteorological Department)
- Base URL: `https://apidoag.opendata.go.th/api/v3`
- Authentication: HTTP headers `api-key` and `secret-key`
- Endpoints:
  - Weather Stations: `/stations/weather`
  - Rainfall Stations: `/stations/rainfall`
  - Current Weather: `/weather/stations/daily-weather?date=YYYY-MM-DD`
  - Current Rainfall: `/weather/stations/daily-rainfall?date=YYYY-MM-DD`

## Running the Scripts

### Testing API Connections

```bash
node src/scripts/test-api-connections.mjs
```

This will test all the API connections and report success or failure for each endpoint.

### Running the ThaiWater Sync

```bash
# Run normally
node src/scripts/thaiwater-sync.mjs

# Run with test connection only
node src/scripts/thaiwater-sync.mjs --test-connection

# Run as scheduled job (for production)
node src/scripts/thaiwater-sync.mjs --scheduled
```

### Running the TMD Sync

```bash
# Run normally
node src/scripts/tmd-sync.mjs

# Run with test connection only
node src/scripts/tmd-sync.mjs --test-connection

# Run as scheduled job (for production)
node src/scripts/tmd-sync.mjs --scheduled
```

### Running the ThaiWater Sync

```bash
# Run normally
node src/scripts/sync-hii-data.mjs

# Run with test connection only
node src/scripts/sync-hii-data.mjs --test-connection

# Run as scheduled job (for production)
node src/scripts/sync-hii-data.mjs --scheduled
```

## Troubleshooting

### 404 Errors from ThaiWater API
If you receive 404 errors with messages like "no eid", it likely means the API endpoints or authentication parameters have changed. The ThaiWater API uses encoded IDs (eid) that may expire or change periodically.

Solution:
1. Contact ThaiWater/HII for updated API credentials
2. Update the MID and EID values in the scripts

### Missing TMD API Credentials
If you see errors about missing TMD API credentials, ensure you've set the `TMD_API_KEY` and `TMD_API_SECRET` environment variables in your `.env` file.

Solution:
1. Add the required environment variables to your `.env` file
2. If you don't have credentials, apply for API access at [https://data.go.th/](https://data.go.th/)

### Database Connection Issues
Database connection errors may occur if your credentials are incorrect or if the database is unreachable.

Solution:
1. Verify your database connection parameters in the `.env` file
2. Check if the database server is running and accessible from your network
3. Ensure your IP is whitelisted if the database has IP restrictions

## Logs

Both sync scripts use detailed logging that is saved to:
- `logs/thaiwater-sync.log` for ThaiWater sync
- `logs/tmd-sync.log` for TMD sync

For manual runs, logs are also output to the console.

## Recent Fixes (March 2025)

### API Connection Fixes
- Fixed the HTTP method for making API requests to both ThaiWater and TMD endpoints.
- Updated the API URLs to use exact formats that work in browser testing.
- Enhanced logging capabilities to better diagnose connection issues.
- Added comprehensive test script for verifying API connections.

### Database Data Preservation Logic
- Added protection against overwriting existing data with empty values in database operations.
- Implemented CASE statements in SQL UPDATE operations to only update fields if new values are not null or empty.
- This prevents the loss of previously stored data when an API returns incomplete information.
- Applied this protection to all tables including:
  - thaiwater_tele_stations (station metadata)
  - thaiwater_rainfall (rainfall measurements)
  - tmd_weather_observations (weather data)

This data preservation approach allows the sync scripts to:
- Maintain accurate station metadata even when fields are missing in API responses
- Preserve historical data even when partial updates are received
- Maintain data integrity by validating inputs before database operations

### Troubleshooting
If you experience missing or deleted data after a sync operation:
1. Check that the database backup table exists with `SELECT COUNT(*) FROM thaiwater_tele_stations_backup`
2. Restore data from backup using the restore-station-data.js script
3. Verify that the sync scripts are using the latest version with data preservation logic

## Logs

Both sync scripts use detailed logging that is saved to:
- `logs/thaiwater-sync.log` for ThaiWater sync
- `logs/tmd-sync.log` for TMD sync

For manual runs, logs are also output to the console.

## Recent Fixes (March 2025)

### HTTP Request Method Fix

The scripts were previously experiencing issues with the HTTP client wrapper when making API requests. The following fixes were implemented:

1. Fixed the HTTP logger to properly sanitize and handle config objects passed to axios methods:
   - Added safety checks to ensure valid configuration objects
   - Created `safeConfig` objects with only necessary properties
   - Prevented passing potentially problematic properties to axios

2. Updated API calls in both scripts:
   - Ensured all API requests use the GET method consistently
   - Fixed URL construction for query parameters
   - Added proper error handling for API responses

3. Added a test script:
   - Created `test-api-connections.mjs` to test all API endpoints
   - Implemented detailed error reporting
   - Added a summary of test results

If you still encounter issues with API connections, please check:
1. API credentials validity and expiration
2. Network connectivity to the API endpoints
3. Any recent changes to the API documentation from ThaiWater or TMD 