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