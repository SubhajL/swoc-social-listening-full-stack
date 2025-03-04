# Task Management System

This directory contains task files and scripts for managing the development workflow in the SWOC Social Listening platform.

## Overview

The task management system provides a structured approach to:
1. Creating new development tasks
2. Tracking task progress
3. Managing git branches for each task
4. Documenting implementation details
5. Ensuring consistent workflow across the team

## Task Files

Task files are stored in the `.tasks` directory with the naming convention:
```
YYYY-MM-DD_N_task-identifier.md
```

Where:
- `YYYY-MM-DD` is the date the task was created
- `N` is the task number for that day
- `task-identifier` is a brief description of the task

## Task Workflow Scripts

The following scripts are available to help manage the task workflow:

### 1. Create Task

```bash
./scripts/create-task.sh "Task Title" "task-identifier" "main-branch-name"
```

This script:
- Creates a new task file from the template
- Creates a new git branch for the task
- Sets up the initial task structure

### 2. Update Task Progress

```bash
./scripts/update-task.sh "STATUS" "Description of progress"
```

This script:
- Adds a timestamped entry to the Task Progress section
- Automatically finds the correct task file based on the current branch

### 3. Complete Task

```bash
./scripts/complete-task.sh "Commit message" "yes/no" "yes/no"
```

This script:
- Commits all changes (excluding task files)
- Optionally merges the task branch to the main branch
- Optionally deletes the task branch after merging

## Task File Structure

Each task file follows a consistent structure:

1. **Context**: Basic information about the task
2. **Task Description**: Detailed description of what needs to be done
3. **Project Overview**: Brief description of the project
4. **Execution Protocol**: Step-by-step instructions for completing the task
5. **Task Analysis**: Analysis of the task and related code
6. **Task Analysis Tree**: Structure of relevant files and components
7. **Steps to Take**: Planned steps for implementation
8. **Current Execution Step**: Current status of execution
9. **Important Notes**: Any important notes or considerations
10. **Task Progress**: Timestamped log of progress
11. **Final Review**: Summary of changes and impact

## Git Workflow

The git workflow for tasks follows these steps:

1. Create a new branch from the main branch
2. Make changes and commit them
3. Update task progress as you go
4. When complete, merge back to the main branch
5. Delete the task branch (optional)

## Best Practices

1. Always create a task file before starting work
2. Keep the task file updated with your progress
3. Follow the execution protocol in the task file
4. Document any issues or challenges encountered
5. Provide a thorough final review when the task is complete

## YOLO Mode

Tasks can be run in "YOLO Mode" which skips confirmation steps. This is useful for experienced developers who are familiar with the workflow.

To enable YOLO Mode, set the YOLO MODE field in the task file to "on".

## Locked Features

Some features of the codebase are locked and should not be modified without team approval. These are documented in the LOCKS.md file in the root directory.

Always check LOCKS.md before making changes to ensure you're not modifying locked features. 