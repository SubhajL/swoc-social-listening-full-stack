#!/bin/bash

# Navigate to the script directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p ../../logs

# Path to the plist file
PLIST_FILE="com.swoc.datasync.plist"
TARGET_DIR="$HOME/Library/LaunchAgents"

# Check if plist file exists
if [ ! -f "$PLIST_FILE" ]; then
  echo "Error: $PLIST_FILE not found!"
  exit 1
fi

# Make sure the LaunchAgents directory exists
mkdir -p "$TARGET_DIR"

# Install the plist file
cp "$PLIST_FILE" "$TARGET_DIR/"
chmod 644 "$TARGET_DIR/$PLIST_FILE"

# Load the plist file
launchctl unload "$TARGET_DIR/$PLIST_FILE" 2>/dev/null || true
launchctl load -w "$TARGET_DIR/$PLIST_FILE"

# Check if it's loaded
LOADED=$(launchctl list | grep com.swoc.datasync || echo "")

if [ -n "$LOADED" ]; then
  echo "Data sync scheduler has been installed and started successfully!"
  echo "It will automatically start on system boot."
  echo ""
  echo "To start manually: launchctl start com.swoc.datasync"
  echo "To stop: launchctl stop com.swoc.datasync"
  echo "To uninstall: launchctl unload -w $TARGET_DIR/$PLIST_FILE && rm $TARGET_DIR/$PLIST_FILE"
else
  echo "Failed to install the data sync scheduler."
  echo "Please check the logs at ../../logs/launchd-error.log"
fi 