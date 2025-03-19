#!/bin/bash

# Path to the plist file
PLIST_FILE="com.swoc.datasync.plist"
TARGET_DIR="$HOME/Library/LaunchAgents"
FULL_PATH="$TARGET_DIR/$PLIST_FILE"

# Check if plist file exists in LaunchAgents
if [ ! -f "$FULL_PATH" ]; then
  echo "Data sync scheduler is not installed at $FULL_PATH"
  exit 0
fi

# Unload the service
echo "Stopping and unloading data sync scheduler..."
launchctl stop com.swoc.datasync 2>/dev/null || true
launchctl unload -w "$FULL_PATH" 2>/dev/null || true

# Remove the plist file
echo "Removing launchd plist file..."
rm -f "$FULL_PATH"

# Verify removal
if [ ! -f "$FULL_PATH" ]; then
  echo "Data sync scheduler has been successfully uninstalled."
else
  echo "Failed to remove $FULL_PATH. You may need to manually delete it."
fi 