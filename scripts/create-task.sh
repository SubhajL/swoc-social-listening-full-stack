#!/bin/bash

# Script to create a new task with proper git workflow
# Usage: ./scripts/create-task.sh "Task Title" "task-identifier" "main-branch-name"

# Set default values
TASK_TITLE=${1:-"New Task"}
TASK_IDENTIFIER=${2:-"general-task"}
MAIN_BRANCH=${3:-"integration-post"}
YOLO_MODE="on"
CREATOR_NAME=$(git config user.name || echo "developer")
CURRENT_DATE=$(date +%Y-%m-%d)

# Get the next task number
TASK_ID_FILE=".tasks/task_id.tmp"
if [ -f "$TASK_ID_FILE" ]; then
    LAST_TASK=$(cat "$TASK_ID_FILE")
    LAST_DATE=$(echo $LAST_TASK | cut -d'_' -f1)
    LAST_NUMBER=$(echo $LAST_TASK | cut -d'_' -f2)
    
    if [ "$LAST_DATE" == "$CURRENT_DATE" ]; then
        TASK_NUMBER=$((LAST_NUMBER + 1))
    else
        TASK_NUMBER=1
    fi
else
    TASK_NUMBER=1
fi

# Create task ID
TASK_ID="${CURRENT_DATE}_${TASK_NUMBER}"
echo "$TASK_ID" > "$TASK_ID_FILE"

# Create branch name
BRANCH_NAME="task/${TASK_IDENTIFIER}_${TASK_ID}"

# Create task file name
TASK_FILE_NAME="${TASK_ID}_${TASK_IDENTIFIER}.md"
TASK_FILE_PATH=".tasks/${TASK_FILE_NAME}"

# Switch to main branch and create task branch
echo "Switching to $MAIN_BRANCH branch..."
git checkout "$MAIN_BRANCH"
git pull

echo "Creating new task branch: $BRANCH_NAME..."
git checkout -b "$BRANCH_NAME"

# Create task file from template
echo "Creating task file: $TASK_FILE_PATH..."
if [ -f ".tasks/task_template.md" ]; then
    cp ".tasks/task_template.md" "$TASK_FILE_PATH"
    
    # Replace placeholders in the task file
    CREATION_TIMESTAMP=$(date +"%Y-%m-%d_%H:%M:%S")
    
    # Use sed to replace placeholders
    sed -i '' "s/\[TASK_TITLE\]/$TASK_TITLE/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[TASK_DATE\]/$CURRENT_DATE/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[TASK_NUMBER\]/$TASK_NUMBER/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[CREATION_TIMESTAMP\]/$CREATION_TIMESTAMP/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[CREATOR_NAME\]/$CREATOR_NAME/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[MAIN_BRANCH\]/$MAIN_BRANCH/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[TASK_IDENTIFIER\]/$TASK_IDENTIFIER/g" "$TASK_FILE_PATH"
    sed -i '' "s/\[on\/off\]/$YOLO_MODE/g" "$TASK_FILE_PATH"
    
    echo "Task file created successfully!"
else
    echo "Error: Task template file not found at .tasks/task_template.md"
    exit 1
fi

# Verify current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

echo "Task setup complete!"
echo "Task ID: $TASK_ID"
echo "Task Branch: $BRANCH_NAME"
echo "Task File: $TASK_FILE_PATH"
echo ""
echo "Next steps:"
echo "1. Edit the task file to add your task description"
echo "2. Begin task analysis"
echo "3. Follow the execution protocol in the task file" 