# Task: Refactor StationCardEdit and implement user authentication state

## Context
- **Task ID**: 2025-03-13_1
- **Created**: 2025-03-13_18:55:14
- **Created by**: Subhaj Limanond
- **Main branch**: integration-post
- **Task branch**: task/refactor-stationcardeditedit-auth
- **YOLO MODE**: on

## Task Description
This task involves two main objectives:

1. Refactor the StationCardEdit component and related functionality to improve state management, error handling, and user experience. The current implementation has issues with state synchronization, navigation flow, and error handling.

2. Implement a centralized user authentication state management system using Jotai that can be accessed throughout the application.

## Project Overview
A social monitoring and automated response generation platform for severe water-related incidents such as flooding, drought, as well as other generic questions and requests for the Royal Irrigation Department (RID) of Thailand. The platform follows specific tech stacks and conventions as specified in .cursorrules.

## Execution Protocol
```
# Execution Protocol:

## 1. Git Branch Creation
1. Create a new task branch from integration-post:
   ```
   git checkout integration-post
   git pull
   git checkout -b task/refactor-stationcardeditedit-auth
   ```
2. Add the branch name to the task file under "Context".
3. Verify the branch is active:
   ```
   git branch --show-current
   ```

## 2. Task File Creation
1. Create the task file, naming it `2025-03-13_1_general-task.md` and place it in the `.tasks` directory.
2. Implement the task file using the "Task Template" structure.
   a. Start by adding the contents of the "Task Template" to the task file.
   b. Adjust the values of all placeholders based on the task requirements.
3. Make a visible note that the "Execution Protocol" should NEVER be removed or edited.

<<< HALT IF NOT [YOLO MODE]: Before continuing, wait for the user to confirm the name and contents of the task file >>>

## 3. Task Analysis
1. Examine the task by looking at related code and functionality step-by-step:
   a. Find out the core files and implementation details involved in the task.
      - Store what you've found under the "Task Analysis Tree" section.
   b. Branch out
      - Analyze what is currently in the "Task Analysis Tree".
      - Look at other files and functionality related to what is currently in the "Task Analysis Tree".
      - Merge and add the newly gathered information to the "Task Analysis Tree".
   c. Repeat b until you have a full understanding of everything involved in solving the task.
2. Double check everything in the "Task Analysis Tree"
   - Ensure it only contains information essential for solving the task.

<<< HALT IF NOT [YOLO MODE]: Before continuing, wait for user confirmation that your analysis is satisfactory >>>

## 4. Iterate on the Task
1. Analyze code context fully before making changes.
2. Review "Task Progress" to avoid repeating previous mistakes or unsuccessful changes.
3. Make changes to the codebase as needed.
4. Update progress under "Task Progress" in the task file.
5. For each change:
   - Seek user confirmation on updates.
   - Mark changes as SUCCESSFUL or UNSUCCESSFUL in the log after user confirmation.
   - When appropriate, commit code:
     ```
     git add --all -- ':!./.tasks'
     git commit -m "[COMMIT_MESSAGE]"
     ```

<<< HALT IF NOT [YOLO MODE]: Before continuing, confirm with the user if the changes were successful >>>

## 5. Task Completion
1. After user confirmation, and if there are changes to commit:
   - Stage all changes EXCEPT the task file:
     ```
     git add --all -- ':!./.tasks'
     ```
   - Commit changes with a concise message:
     ```
     git commit -m "[COMMIT_MESSAGE]"
     ```

<<< HALT IF NOT [YOLO MODE]: Before continuing, ask the user if the task branch should be merged into the main branch >>>

## 6. Merge Task Branch
1. Confirm with the user before merging into integration-post.
2. If approved:
   - Checkout integration-post:
     ```
     git checkout integration-post
     ```
   - Merge:
     ```
     git merge task/refactor-stationcardeditedit-auth
     ```
3. Confirm that the merge was successful by running:
   ```
   git log integration-post..task/refactor-stationcardeditedit-auth | cat
   ```
4. Delete the task branch:
   ```
   git branch -d task/refactor-stationcardeditedit-auth
   ```