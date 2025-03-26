# Task: Integrate RID Telemetry API

## Context
- **Task ID**: 2025-03-22_1
- **Created**: 2025-03-22_07:45:10
- **Created by**: Subhaj Limanond
- **Main branch**: integration-post
- **Task branch**: task/rid-telemetry-api_2025-03-22_1
- **YOLO MODE**: on

## Task Description
Create a new script to integrate with the RID Telemetry API, leveraging existing code from the `/scripts` directory. The script will:

1. Fetch telemetry data from the RID API for water level and rainfall stations
2. Process the data into a structured format compatible with our database schema
3. Save the data to the appropriate database tables
4. Implement proper error handling, logging, and type safety
5. Follow the OAuth implementation pattern used in existing scripts

This integration will allow us to automatically retrieve real-time telemetry data from RID stations, enhancing our monitoring capabilities and data accuracy.

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
   git checkout -b task/rid-telemetry-api_2025-03-22_1
   ```
2. Add the branch name to the task file under "Context".
3. Verify the branch is active:
   ```
   git branch --show-current
   ```

## 2. Task File Creation
1. Create the task file, naming it `2025-03-22_1_rid-telemetry-api.md` and place it in the `.tasks` directory.
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
     git merge task/rid-telemetry-api_2025-03-22_1
     ```
3. Confirm that the merge was successful by running:
   ```
   git log integration-post..task/rid-telemetry-api_2025-03-22_1 | cat
   ```

## 7. Delete Task Branch
1. Ask the user if the task branch should be deleted.
2. If approved, delete the task branch:
   ```
   git branch -d task/rid-telemetry-api_2025-03-22_1
   ```

<<< HALT IF NOT [YOLO MODE]: Before continuing, confirm with the user that the task branch was deleted successfully >>>

## 8. Final Review
1. Complete the "Final Review" section in the task file.
2. Update the task file with a summary of all changes made.

<<< HALT IF NOT [YOLO MODE]: Before we are done, give the user the final review >>>
```

NOTE: The above execution protocol should NEVER be removed or edited.

## Task Analysis
- Purpose: Create a script to integrate with the RID Telemetry API to fetch, process, and store real-time telemetry data.
- Issues identified:
  - Need for automated telemetry data collection from RID API
  - Existing scripts show OAuth implementation pattern but no dedicated telemetry data fetch script
  - Type safety for API response data needed
  - Proper error handling for API integration required
- Implementation goals:
  - Create a new script for fetching telemetry data from RID API
  - Process and normalize the data to match our database schema
  - Implement proper logging and error handling
  - Ensure type safety in data processing
  - Make the script runnable as a scheduled task

## Task Analysis Tree
```
scripts/
├── sync-telemetry-stations-to-data.js - Existing script that fetches station info but not telemetry data
├── get-hourly-data-directly.js - Simple hourly data fetch script
├── get-hourly-data-for-stations.js - More complex hourly data fetch for specific stations
└── telemetry_test_results/ - Contains test results from API tests
    └── telemetry_test_2025-03-21T09-49-52-867Z.md - Shows successful telemetry API integration tests

apps/
├── backend/
│   ├── src/
│   │   ├── api/ - API endpoints
│   │   └── .env - Contains RID API credentials
└── frontend/
    └── src/
        └── components/
            └── monitoring/ - Components that display telemetry data
```

## Steps to Take
1. Examine existing scripts to understand the RID API authentication and data retrieval patterns
2. Create a new script file for fetching telemetry data from the RID API
3. Implement OAuth authentication similar to existing scripts
4. Add data processing function to normalize API response
5. Implement database integration to store the data
6. Add error handling, logging, and type checking
7. Test the script with sample stations
8. Document usage instructions in the script header

## Current Execution Step
Testing the telemetry API integration script

## Important Notes
- RID API requires OAuth 1.0a authentication
- The OAuth implementation is LOCKED as per LOCKS.md
- Telemetry Station System is also LOCKED, so we should follow existing patterns
- Jotai should be considered for any new state management needs
- Need to ensure proper error handling for API integration
- The script requires a `telemetry_data` table to be present in the database with proper schema

## Task Progress
- 2025-03-22_07:50:10 [IN PROGRESS]: Created task file and branch
- 2025-03-22_07:55:22 [IN PROGRESS]: Completed initial task analysis
- 2025-03-22_08:05:15 [IN PROGRESS]: Starting script creation based on existing patterns
- 2025-03-22_08:30:45 [SUCCESSFUL]: Created fetch-telemetry-data.js script with the following features:
  - OAuth 1.0a authentication using the existing pattern from other scripts
  - Command-line options for specific station, all stations, and date selection
  - Proper date formatting for the RID API (Buddhist Era)
  - Database integration with transaction support
  - Comprehensive error handling and logging
  - Summary reporting for multiple stations
- 2025-03-22_08:45:30 [SUCCESSFUL]: Created create-telemetry-data-table.js script to:
  - Create the telemetry_data table to store telemetry readings
  - Add proper indexes for performance
  - Support existing tables by checking for presence and adding missing columns
  - Include constraints to prevent duplicate readings

## Final Review
- Summary of changes:
  - [CHANGE_1]
  - [CHANGE_2]
  - [CHANGE_3]
- Impact:
  - [IMPACT_1]
  - [IMPACT_2]
- Future improvements:
  - [IMPROVEMENT_1]
  - [IMPROVEMENT_2] 