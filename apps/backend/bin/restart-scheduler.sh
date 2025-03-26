#!/bin/bash

# restart-scheduler.sh
# 
# This script restarts the data synchronization scheduler.
# It first stops any running scheduler process, then starts a new one.
# Use this script after making changes to the scheduler configuration or
# fixing issues with data synchronization scripts.

echo "Restarting data synchronization scheduler..."

# Navigate to the backend directory
cd "$(dirname "$0")/.." || exit 1

# Stop the current scheduler if running
echo "Stopping current scheduler..."
npm run scheduler:stop

# Wait a moment to ensure the process has stopped
sleep 2

# Start the scheduler
echo "Starting scheduler..."
npm run scheduler:start

# Show status
echo "Scheduler status:"
npm run scheduler:status

echo "Scheduler restart completed."
echo "You can check the logs with: npm run scheduler:logs"

# Run an immediate reservoir data sync to test the fix
echo "Running immediate reservoir data sync to test the fix..."
npm run sync:reservoir

echo "Done! Check the logs for any errors." 