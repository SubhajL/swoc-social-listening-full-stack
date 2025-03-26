# Rainfall Data Synchronization System

This document provides detailed information about the Rainfall Data Synchronization system, which syncs data from ThaiWater and TMD APIs into the PostgreSQL database.

## Overview

The system consists of three main components:

1. **Scheduler** (`schedule-rainfall-sync.mjs`): Manages the scheduling of sync jobs
2. **ThaiWater Sync** (`sync-hii-data.mjs`): Syncs rainfall data from ThaiWater API
3. **TMD Sync** (`sync-tmd-data.mjs`): Syncs rainfall data from TMD API

## Recent Improvements

The following improvements have been made to address intermittent failures in scheduled executions:

### 1. Robust Environment Variable Handling
- Explicit environment file path resolution
- Verification of required environment variables before attempting DB connections
- Detailed logging of environment configuration (with sensitive data masking)

### 2. Working Directory and Execution Context
- Explicit working directory setting for scheduled executions
- Additional environment flags to differentiate scheduled vs. manual runs

### 3. Enhanced Error Logging and Monitoring
- Improved log rotation and context information
- Memory usage tracking
- Detailed error capture with stack traces

### 4. Robust Database Connection Management  
- Connection pool checking and validation before operation
- Proper error handling for connection issues
- Explicit client release in all database operations
- Connection health check scheduled hourly

### 5. API Reliability Enhancement
- Implemented exponential backoff retry logic for API calls
- Consistent handling of SSL/TLS settings
- Enhanced timeout configurations

### 6. Concurrency and Resource Management
- Prevention of overlapping job executions
- Proper cleanup of database connections
- Explicit handling of process termination signals (SIGINT, SIGTERM)

### 7. NULL Value Handling (March 2025)
- Improved handling of NULL values in rainfall data
- Preserving original NULL values from API instead of defaulting to 0
- Enhanced data quality for analysis purposes

### 8. Transaction Isolation (March 2025)
- Separated station and rainfall data transactions
- Disabled station data updates to prevent transaction aborts
- More reliable rainfall data synchronization

### 9. API Data Analysis (March 2025)
- Better understanding of API data coverage (approx. 46%)
- Identified distribution of station IDs in rainfall data
- Enhanced monitoring of NULL values in rainfall fields

## Environment Configuration

The system requires the following environment variables to be set in the `.env` file:

```
# Database Configuration
DB_HOST=your_database_host
DB_PORT=your_database_port
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_SSL=true_or_false

# Optional Configuration
DB_POOL_SIZE=20
NODE_ENV=production
TZ=Asia/Bangkok
```

## Running the Sync Processes

### Manual Execution
Run the following commands to manually execute the sync processes:

```bash
# Run ThaiWater sync
npm run sync:thaiwater:manual

# Run TMD sync
npm run sync:tmd:manual
```

### Scheduled Execution
To start the scheduler which will run the jobs automatically at 8:00 AM and 8:15 AM daily:

```bash
# Start the scheduler
npm run scheduler:start

# Check scheduler status
npm run scheduler:status

# Stop the scheduler
npm run scheduler:stop
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues

**Symptoms:**
- Error logs showing "connection refused" or "timeout"
- Jobs failing immediately after startup

**Solutions:**
- Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD are correct in .env
- Check database server is accessible from the host running the scripts
- Increase connection timeout if network is slow:
  ```
  DB_CONNECTION_TIMEOUT=30000  # 30 seconds
  ```

#### 2. API Connection Issues

**Symptoms:**
- Error logs showing API request failures
- No data being synchronized

**Solutions:**
- Check network connectivity to ThaiWater and TMD APIs
- Ensure NODE_TLS_REJECT_UNAUTHORIZED=0 is set if using self-signed certificates
- Try increasing the API timeout:
  ```
  API_TIMEOUT=120000  # 120 seconds
  ```

#### 3. Scheduler Not Running

**Symptoms:**
- No sync logs being generated at scheduled times
- `npm run scheduler:status` shows "scheduler is not running"

**Solutions:**
- Start the scheduler with `npm run scheduler:start`
- Check for any error logs in the scheduler startup
- Ensure the server has not restarted without restarting the scheduler

### Diagnostic Tools

#### Log Analysis

Critical logs are stored in the following locations:
- `logs/thaiwater-sync.log` - ThaiWater sync process logs
- `logs/tmd-sync.log` - TMD sync process logs
- `logs/all-sync-jobs.log` - Combined logs from all sync processes

#### Database Connectivity Check

Run the following command to check database connectivity:

```bash
npm run test-db-connection
```

#### API Diagnostics

Run the diagnostics tools to check API connectivity:

```bash
npm run sync:diagnostics:thaiwater
npm run sync:diagnostics:tmd
```

## Monitoring

The system includes built-in monitoring capabilities:

- **Progress Tracking**: `npm run track-progress`
- **Report Generation**: `npm run generate-report`

## System Requirements

- Node.js v20.10.0 or higher
- PostgreSQL 13 or higher
- Network access to ThaiWater and TMD APIs

## Maintenance

Regular maintenance tasks:

1. Check log files and rotate if needed
2. Monitor disk space usage
3. Verify database connection health
4. Update the axios-retry and node-schedule packages when new versions are available

## Safety Mechanisms

The system includes several safety mechanisms:

1. Prevention of overlapping job executions
2. Automatic retry for failed API requests
3. Proper error handling for database operations
4. Hourly health checks for database connectivity
5. Proper cleanup of resources on process termination 