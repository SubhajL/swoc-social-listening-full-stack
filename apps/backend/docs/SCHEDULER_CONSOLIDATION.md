# Scheduler Consolidation

## Overview

This document explains the recent consolidation of data synchronization schedulers into a single unified system.

## Problem Statement

Previously, the system had three separate scheduler implementations:

1. **`schedule-data-sync.mjs`**: Main scheduler for multiple data types
2. **`schedule-reservoir-sync.mjs`**: Specific scheduler for reservoir data at 9:00 AM
3. **`reservoir-sync.mjs`** (in cron folder): Another reservoir scheduler at 6:00 AM

This configuration caused several issues:
- Multiple schedulers running the same tasks at different times
- Potential conflicts between schedulers
- Confusion about which scheduler was responsible for which task
- Inconsistent error handling and logging
- Maintenance overhead from having to update multiple files

## Solution

We have consolidated all scheduling into a single scheduler:

**`apps/backend/src/scripts/schedule-data-sync.mjs`**

This scheduler now manages all data synchronization tasks:
- Reservoir data: Daily at 9:00 AM
- HII rainfall data: Hourly at minute 40
- TMD data sync: Hourly at minute 55
- Task progress report: Daily at 9:15 AM

The other schedulers have been deprecated and their scheduling functionality has been disabled.

## How to Use the Consolidated Scheduler

### Starting the Scheduler

```bash
cd apps/backend
npm run scheduler:start
```

### Checking Scheduler Status

```bash
npm run scheduler:status
```

### Stopping the Scheduler

```bash
npm run scheduler:stop
```

### Restarting the Scheduler

```bash
npm run scheduler:restart
```

### Viewing Scheduler Logs

```bash
npm run scheduler:logs
```

## Adding New Scheduled Tasks

If you need to add a new scheduled task:

1. Edit **ONLY** the consolidated scheduler file: `apps/backend/src/scripts/schedule-data-sync.mjs`
2. Add a new `schedule.scheduleJob()` call following the existing pattern
3. Use the existing `executeNpmCommand()` function to execute your task

Example:

```javascript
// Schedule a new task to run at 3:00 AM every day
const newTaskJob = schedule.scheduleJob('0 3 * * *', function() {
  executeNpmCommand('your:task:script', 'task_name', 'task description');
});
```

## Cron Expression Reference

Scheduler uses Node.js `node-schedule` package with cron expressions:

```
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7, 1L - 7L) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31, L)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, optional)
```

Common patterns:
- `0 9 * * *`: Every day at 9:00 AM
- `0 */4 * * *`: Every 4 hours
- `30 * * * *`: 30 minutes past every hour

## Troubleshooting

If the scheduler is not running or not executing tasks:

1. Check the logs: `npm run scheduler:logs`
2. Verify that the scheduler process is running: `npm run scheduler:status`
3. Restart the scheduler: `npm run scheduler:restart`
4. Check for errors in the logs directory: `ls -la logs/`
5. Check the database connectivity

If a specific task is failing, you can run it manually:
- For reservoir data: `npm run sync:reservoir`
- For HII rainfall data: `npm run sync:hii`
- For TMD data: `npm run sync:tmd`

## Recent Fixes

### Reservoir Data Synchronization Fix

We recently fixed an issue with the reservoir data synchronization where the script was failing due to a type mismatch between the reservoir IDs in the API response and the database schema. The API returns reservoir IDs in string format (e.g., "rsv123"), but the database was attempting to use these as numeric IDs.

This issue has been resolved by:
1. Changing the database schema to use `VARCHAR(20)` for the `reservoir_id` column
2. Adding a unique constraint on the combination of `reservoir_id` and `date` columns
3. Updating the sync script to correctly handle the string format IDs

For detailed information about this fix, please see the [Reservoir Data Fix Documentation](../docs/RESERVOIR_DATA_FIX.md).

To restart the scheduler after applying these fixes, use:
```
./src/scripts/restart-scheduler.sh
```

## Note on Deprecated Schedulers

The following files have been deprecated and should not be used:

1. `apps/backend/src/scripts/schedule-reservoir-sync.mjs`
2. `apps/backend/src/cron/reservoir-sync.mjs`

If you attempt to run these directly, you will see a deprecation warning in the logs. 