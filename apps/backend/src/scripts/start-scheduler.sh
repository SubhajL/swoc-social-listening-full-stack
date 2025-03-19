#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")/../.."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get the current date for log file naming
DATE=$(date +"%Y%m%d")

# Kill any existing scheduler processes
pkill -f "node.*schedule-data-sync.mjs" || true

# Start the scheduler in the background with logging
NODE_TLS_REJECT_UNAUTHORIZED=0 node src/scripts/schedule-data-sync.mjs > logs/scheduler-$DATE.log 2>&1 &

# Save the PID to a file for later management
echo $! > .scheduler.pid

echo "Data sync scheduler started with PID $(cat .scheduler.pid)"
echo "Logs are being written to logs/scheduler-$DATE.log" 