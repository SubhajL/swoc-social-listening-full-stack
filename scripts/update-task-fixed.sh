#!/bin/bash

# Fixed script to update task progress
# Usage: ./scripts/update-task-fixed.sh <task_id> <description>

# Check if task ID is provided
if [ -z "$1" ]; then
    echo "Error: Task ID is required."
    echo "Usage: ./scripts/update-task-fixed.sh <task_id> <description>"
    exit 1
fi

# Set values
TASK_ID=$1
DESCRIPTION=${2:-"Working on task"}

# Find the exact task file
TASK_FILE=".tasks/${TASK_ID}.md"

# If the exact file doesn't exist, try to find it with a more flexible pattern
if [ ! -f "$TASK_FILE" ]; then
    TASK_FILE=$(find .tasks -name "*${TASK_ID}*.md" -type f | head -n 1)
fi

# If still not found, try one more pattern
if [ -z "$TASK_FILE" ] || [ ! -f "$TASK_FILE" ]; then
    TASK_FILE=$(find .tasks -name "*${TASK_ID}*" -type f | head -n 1)
fi

# Check if task file exists
if [ -z "$TASK_FILE" ] || [ ! -f "$TASK_FILE" ]; then
    echo "Error: Could not find task file for ID $TASK_ID"
    echo "Available task files:"
    find .tasks -name "*.md" -type f | grep -v "README.md" | grep -v "task_template.md"
    exit 1
fi

echo "Found task file: $TASK_FILE"

# Get current timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H:%M:%S")

# Update task progress
PROGRESS_ENTRY="- $TIMESTAMP [SUCCESSFUL]: $DESCRIPTION"
echo "Adding progress entry: $PROGRESS_ENTRY"

# Check if Task Progress section exists
if grep -q "## Task Progress" "$TASK_FILE"; then
    # Append to existing Task Progress section
    sed -i '' "/## Task Progress/a\\
$PROGRESS_ENTRY" "$TASK_FILE"
else
    # Create Task Progress section if it doesn't exist
    echo -e "\n## Task Progress\n$PROGRESS_ENTRY" >> "$TASK_FILE"
fi

echo "Task progress updated successfully!"
echo "You may want to commit the task file separately:"
echo "  git add $TASK_FILE"
echo "  git commit -m \"Update task progress\"" 