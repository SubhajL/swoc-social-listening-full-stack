#!/bin/bash

# Script to complete a task and handle git workflow
# Usage: ./scripts/complete-task.sh "commit-message" "merge-to-main" "delete-branch"

# Set default values
COMMIT_MESSAGE=${1:-"Complete task"}
MERGE_TO_MAIN=${2:-"no"}
DELETE_BRANCH=${3:-"no"}

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

# Stage all changes except task files
echo "Staging changes (excluding .tasks directory)..."
git add --all -- ':!./.tasks'

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit."
else
    # Commit changes
    echo "Committing changes with message: $COMMIT_MESSAGE"
    git commit -m "$COMMIT_MESSAGE"
fi

# Handle merging to main branch if requested
if [[ "$MERGE_TO_MAIN" == "yes" ]]; then
    # Get main branch from task file
    TASK_FILES=$(find .tasks -name "*$TASK_IDENTIFIER*.md" -type f)
    if [ -z "$TASK_FILES" ]; then
        echo "Error: Could not find task file for branch $CURRENT_BRANCH"
        echo "Please specify the main branch manually."
        read -p "Main branch name: " MAIN_BRANCH
    else
        TASK_FILE=$(echo "$TASK_FILES" | head -n 1)
        MAIN_BRANCH=$(grep -m 1 "Main branch" "$TASK_FILE" | cut -d':' -f2 | tr -d ' ')
        
        if [ -z "$MAIN_BRANCH" ]; then
            echo "Error: Could not extract main branch from task file."
            echo "Please specify the main branch manually."
            read -p "Main branch name: " MAIN_BRANCH
        fi
    fi
    
    # Merge to main branch
    echo "Merging to $MAIN_BRANCH branch..."
    git checkout "$MAIN_BRANCH"
    git pull
    git merge "$CURRENT_BRANCH" --no-ff -m "Merge $CURRENT_BRANCH into $MAIN_BRANCH"
    
    # Verify merge
    echo "Verifying merge..."
    git log "$MAIN_BRANCH".."$CURRENT_BRANCH" | cat
    
    # Delete branch if requested
    if [[ "$DELETE_BRANCH" == "yes" ]]; then
        echo "Deleting branch $CURRENT_BRANCH..."
        git branch -d "$CURRENT_BRANCH"
        echo "Branch deleted."
    else
        # Switch back to task branch
        git checkout "$CURRENT_BRANCH"
    fi
fi

echo "Task completion process finished!"
if [[ "$MERGE_TO_MAIN" == "yes" ]]; then
    echo "Current branch: $(git branch --show-current)"
    if [[ "$DELETE_BRANCH" == "yes" ]]; then
        echo "Task branch $CURRENT_BRANCH has been deleted."
    fi
else
    echo "Remember to merge your changes to the main branch when ready:"
    echo "  git checkout $MAIN_BRANCH"
    echo "  git merge $CURRENT_BRANCH"
fi 