# ThaiWater API Integration

This service integrates with the ThaiWater API to fetch rainfall data from stations across Thailand. The service provides functionality to filter stations by geographic location (amphure and province).

## Setup Requirements

1. PostgreSQL database with PostGIS extension
2. Amphure table with geometry data for spatial queries

## Installation Steps

### 1. Install PostGIS Extension

Run the following command to install the PostGIS extension in your database:

```bash
npm run install-postgis
```

This script will:
- Check if PostGIS is already installed
- Install the PostGIS extension if needed
- Add geometry columns to the location tables

### 2. Create the Amphure Table

Run the following command to create the amphure table with geometry data:

```bash
npm run create-amphure-table
```

This script will:
- Create a new table called `amphure` with the necessary columns
- Add a geometry column for spatial queries
- Migrate data from the existing `amphures` table if available
- Create buffer polygons around points to enable spatial filtering

### 3. Test the ThaiWater Location Service

After setting up the database, you can test the ThaiWater location service with:

```bash
npm run test-thaiwater-location
```

This script will:
- Verify that the amphure table exists and has data
- Check that the geom column is present
- Test fetching rainfall data by amphure
- Test fetching rainfall data by province
- Test fetching rainfall data by both amphure and province

## API Endpoints

### Get Rainfall Data by Location

```
GET /api/rain-stations/thaiwater?amphure=<amphure_name>&province=<province_name>
```

Query Parameters:
- `amphure`: (Optional) Name of the amphure to filter by
- `province`: (Optional) Name of the province to filter by

At least one of `amphure` or `province` must be provided.

## Service Functions

### `getRainfallByLocation(amphure, province)`

Fetches rainfall data for stations in a specific amphure or province.

Parameters:
- `amphure`: (Optional) Name of the amphure to filter by
- `province`: (Optional) Name of the province to filter by

Returns:
- A response object containing station information and rainfall data for stations within the specified geographic boundaries.

## Troubleshooting

If you encounter issues with the geographic filtering:

1. Verify that PostGIS is installed:
   ```sql
   SELECT PostGIS_version();
   ```

2. Check that the amphure table has geometry data:
   ```sql
   SELECT COUNT(*) FROM amphure WHERE geom IS NOT NULL;
   ```

3. Verify that the boundaries are being calculated correctly:
   ```sql
   SELECT 
     MIN(ST_Y(ST_Centroid(geom))) as min_lat,
     MAX(ST_Y(ST_Centroid(geom))) as max_lat,
     MIN(ST_X(ST_Centroid(geom))) as min_long,
     MAX(ST_X(ST_Centroid(geom))) as max_long
   FROM amphure
   WHERE amphure_name = 'your_amphure_name';
   ```

4. If no stations are found, the service will fall back to using province-level boundaries or default to the entire country of Thailand. 