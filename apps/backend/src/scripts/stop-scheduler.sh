#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")/../.."

# Check if PID file exists
if [ -f .scheduler.pid ]; then
  PID=$(cat .scheduler.pid)
  
  # Check if process is still running
  if ps -p $PID > /dev/null; then
    echo "Stopping data sync scheduler with PID $PID"
    kill $PID
    rm .scheduler.pid
    echo "Scheduler stopped"
  else
    echo "Scheduler process with PID $PID is not running"
    rm .scheduler.pid
  fi
else
  # Try to find and kill by process name
  echo "PID file not found, attempting to find scheduler process"
  PIDS=$(pgrep -f "node.*schedule-data-sync.mjs")
  
  if [ -n "$PIDS" ]; then
    echo "Found scheduler processes with PIDs: $PIDS"
    pkill -f "node.*schedule-data-sync.mjs"
    echo "Scheduler processes stopped"
  else
    echo "No running scheduler processes found"
  fi
fi 