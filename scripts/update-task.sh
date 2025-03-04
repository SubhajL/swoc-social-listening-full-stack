#!/bin/bash

# Script to update task progress
# Usage: ./scripts/update-task.sh "status" "description"

# Set default values
STATUS=${1:-"IN PROGRESS"}
DESCRIPTION=${2:-"Working on task"}

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Check if current branch is a task branch
if [[ ! $CURRENT_BRANCH == task/* ]]; then
    echo "Error: Current branch is not a task branch."
    echo "Current branch: $CURRENT_BRANCH"
    echo "Please checkout a task branch before running this script."
    exit 1
fi

# Extract task identifier from branch name
TASK_IDENTIFIER=$(echo $CURRENT_BRANCH | sed 's/task\///')

# Find task file - try different patterns
TASK_FILES=$(find .tasks -name "*${TASK_IDENTIFIER}*.md" -o -name "*$(echo $TASK_IDENTIFIER | cut -d'_' -f3-)*.md" -type f)
if [ -z "$TASK_FILES" ]; then
    echo "Error: Could not find task file for branch $CURRENT_BRANCH"
    echo "Searching for all task files..."
    find .tasks -name "*.md" -type f | grep -v "README.md" | grep -v "task_template.md"
    exit 1
fi

TASK_FILE=$(echo "$TASK_FILES" | head -n 1)
echo "Found task file: $TASK_FILE"

# Get current timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H:%M:%S")

# Update task progress
PROGRESS_ENTRY="- $TIMESTAMP $STATUS: $DESCRIPTION"
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