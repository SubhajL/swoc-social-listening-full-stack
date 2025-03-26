# Data Synchronization Scheduler

This document explains the data synchronization scheduler system used in the SWOC Social Listening platform.

## Overview

The application includes two separate scheduler systems:

1. **Backend Scheduler** (Recommended): Located in `apps/backend/src/scripts/schedule-data-sync.mjs`
2. **Root Scheduler**: Located in `scripts/scheduler-service.js` using `scripts/scheduler-config.json`

**⚠️ IMPORTANT: Only use the Backend Scheduler to avoid conflicts and confusion.**

## Scheduled Tasks

The scheduler manages several data synchronization tasks:

| Task | Description | Schedule | NPM Command |
|------|-------------|----------|------------|
| ThaiWater Sync | Syncs rainfall data from ThaiWater API | Every hour at minute 40 | `sync:thaiwater` |
| TMD Sync | Syncs rainfall data from TMD (via ThaiWater API) | Every hour at minute 55 | `sync:tmd` |
| Reservoir Sync | Syncs reservoir data from RID API | Daily at 9:00 AM | `sync:reservoir` |
| Progress Report | Generates a sync status report | Daily at 9:15 AM | `generate-report` |

## Sync Commands

For consistent usage, all synchronization tasks have a standardized command naming pattern:

```bash
# Run ThaiWater sync manually
npm run sync:thaiwater

# Run TMD sync manually
npm run sync:tmd

# Run Reservoir sync manually
npm run sync:reservoir
```

The scheduler uses these standardized commands when executing the scheduled tasks.

## Backend Scheduler Commands

```bash
# Start the scheduler
cd apps/backend && npm run scheduler:start

# Check if the scheduler is running
cd apps/backend && npm run scheduler:status

# Stop the scheduler
cd apps/backend && npm run scheduler:stop
```

## Scheduler Logs

Logs are stored in the following locations:

- Scheduler process log: `apps/backend/logs/scheduler-YYYYMMDD.log`
- ThaiWater sync log: `apps/backend/logs/thaiwater-sync.log`
- TMD sync log: `apps/backend/logs/tmd-sync.log`
- Reservoir sync log: `apps/backend/logs/reservoir-sync-YYYYMMDD.log`
- Sync status report: `apps/backend/logs/sync-report.md`

## Troubleshooting

If you encounter issues with the scheduler:

1. Check if the scheduler is running with `npm run scheduler:status`
2. Review the scheduler logs for errors
3. Restart the scheduler with `npm run scheduler:stop` followed by `npm run scheduler:start`
4. Verify the sync tasks are executing at the expected times

## Avoiding Conflicts

To prevent conflicts between the two scheduler systems:

1. Only use the backend scheduler commands
2. Do not run the root scheduler (`npm run scheduler:run`)
3. Do not install the root scheduler as an autostart service

If the root scheduler is running, stop it with:

```bash
ps aux | grep scheduler-service | grep -v grep
kill <PID>
```

## Customizing the Schedule

To modify the schedule, edit the `apps/backend/src/scripts/schedule-data-sync.mjs` file. The schedule uses cron syntax:

```javascript
// Example: Run ThaiWater sync at 40 minutes past each hour
const thaiWaterJob = schedule.scheduleJob('40 * * * *', function() {
  // ...
});
``` 