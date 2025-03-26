# Legacy Components - DEPRECATED

This directory contains deprecated components that are maintained only for backward compatibility.

## Root Scheduler

The files in this directory (`scheduler-service.js` and `scheduler-config.json`) implement the deprecated "Root Scheduler" system.

⚠️ **IMPORTANT: Do not use these components for new development.**

### Why it's deprecated

The Root Scheduler has been replaced by the Backend Scheduler, which:
- Runs in the backend application context
- Has better integration with application logging
- Avoids potential conflicts with multiple schedulers
- Provides more reliable operation

### If you need a scheduler

Use the Backend Scheduler instead:

```bash
# Start the scheduler
cd apps/backend && npm run scheduler:start

# Check status
cd apps/backend && npm run scheduler:status

# Stop the scheduler
cd apps/backend && npm run scheduler:stop
```

For more information, see the complete documentation at:
`apps/backend/src/scripts/SCHEDULER.md` 