# Telemetry Data Collection Scripts

This directory contains scripts for collecting telemetry data from the RID API. These scripts are used by the scheduler service to automate data collection.

## Scripts

### `fetch-telemetry-data.js`

The main script that fetches telemetry data from the RID API. It uses OAuth 1.0a authentication to access the API and fetches data for a specific station ID.

### `fetch-telemetry-data-by-hydroid.js`

Fetches telemetry data for a specific hydro region ID. This script accepts a hydro region ID as an argument and fetches data for all stations in that region.

Usage:
```bash
node fetch-telemetry-data-by-hydroid.js <hydro_id> [--date YYYY-MM-DD]
```

### `fetch-all-hydro-regions.js`

Fetches telemetry data for all hydro regions (1-8). This script runs through each region and fetches data for all stations.

Usage:
```bash
node fetch-all-hydro-regions.js [--date YYYY-MM-DD]
```

### `schedule-hydroid-sync.js`

A script that manages the synchronization of hydro regions based on their priority. Each region is assigned a priority level (1-5), and the script determines which regions need to be synced based on their last sync time and priority level.

This script is used by the scheduler service to implement priority-based synchronization.

## Integration with Scheduler

These scripts are integrated with the central scheduler service, which is responsible for running all data collection jobs, including telemetry, rainfall, and reservoir data.

The scheduler configuration in `scripts/scheduler-config.json` includes jobs for:
- Syncing all hydro regions every 4 hours
- Syncing critical regions (1 & 2) every hour
- Running the priority-based sync script every 2 hours

## Database Integration

All telemetry data is stored in the `telemetry_data` table. The scripts handle:
- Creating station records if they don't exist
- Storing raw telemetry data in JSON files for backup
- Managing error handling and retries
- Logging data collection status 