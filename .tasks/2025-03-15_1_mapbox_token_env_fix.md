# Task: Fix Mapbox Token Environment Variable Configuration

## Context
- **Task ID**: 2025-03-15_1
- **Created**: 2025-03-15
- **Created by**: Subhajit
- **Main branch**: task/fix-stationcardeditedit-component
- **Task branch**: task/refactor-stationcardeditedit-auth
- **YOLO MODE**: on

## Task Description
Fix the Mapbox token environment variable configuration to ensure proper loading in the frontend application. The application was failing to load the Mapbox token due to inconsistent environment variable naming across different files and the fact that Vite requires the `VITE_` prefix for client-side environment variables.

## Project Overview
A social monitoring and automated response generation platform for severe water-related incidents such as flooding, drought, as well as other generic questions and requests for the Royal Irrigation Department (RID) of Thailand. The platform follows specific tech stacks and conventions as specified in .cursorrules.

## Execution Protocol
```
# Execution Protocol:

## 1. Git Branch Creation
1. Create a new task branch from [MAIN_BRANCH]:
   ```
   git checkout [MAIN_BRANCH]
   git pull
   git checkout -b task/[TASK_IDENTIFIER]_[TASK_DATE]_[TASK_NUMBER]
   ```
2. Add the branch name to the task file under "Context".
3. Verify the branch is active:
   ```
   git branch --show-current
   ```

## 2. Task File Creation
1. Create the task file, naming it `[TASK_DATE]_[TASK_NUMBER]_[TASK_IDENTIFIER].md` and place it in the `.tasks` directory.
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
1. Confirm with the user before merging into [MAIN_BRANCH].
2. If approved:
   - Checkout [MAIN_BRANCH]:
     ```
     git checkout [MAIN_BRANCH]
     ```
   - Merge:
     ```
     git merge task/[TASK_IDENTIFIER]_[TASK_DATE]_[TASK_NUMBER]
     ```
3. Confirm that the merge was successful by running:
   ```
   git log [MAIN_BRANCH]..task/[TASK_IDENTIFIER]_[TASK_DATE]_[TASK_NUMBER] | cat
   ```

## 7. Delete Task Branch
1. Ask the user if the task branch should be deleted.
2. If approved, delete the task branch:
   ```
   git branch -d task/[TASK_IDENTIFIER]_[TASK_DATE]_[TASK_NUMBER]
   ```

<<< HALT IF NOT [YOLO MODE]: Before continuing, confirm with the user that the task branch was deleted successfully >>>

## 8. Final Review
1. Complete the "Final Review" section in the task file.
2. Update the task file with a summary of all changes made.

<<< HALT IF NOT [YOLO MODE]: Before we are done, give the user the final review >>>
```

NOTE: The above execution protocol should NEVER be removed or edited.

## Task Analysis
- Purpose: Fix the Mapbox token environment variable configuration to ensure proper loading in the frontend application
- Issues identified:
  - Environment variable in .env file was named `MAPBOX_TOKEN` but Vite requires `VITE_` prefix
  - Inconsistent environment variable naming across different files
  - Some files were using `process.env.NEXT_PUBLIC_MAPBOX_TOKEN` (Next.js style) while others used `import.meta.env.MAPBOX_TOKEN` (Vite style)
  - The application was failing to load the Mapbox token due to these inconsistencies
- Implementation goals:
  - Update the .env file to use the correct Vite prefix (`VITE_MAPBOX_TOKEN`)
  - Update all references to the Mapbox token to use the correct environment variable name
  - Ensure consistent access pattern across the codebase
  - Fix the Map component to properly load with the Mapbox token

## Task Analysis Tree
```
apps/frontend/
├── .env                                 # Environment file with Mapbox token
├── src/
│   ├── utils/
│   │   └── mapbox.ts                    # Utility for Mapbox token validation and retrieval
│   ├── constants/
│   │   └── config.ts                    # Constants including Mapbox token
│   ├── pages/
│   │   └── MainPage.tsx                 # Main page that uses the Map component
│   └── components/
│       └── Map.tsx                      # Map component that uses the Mapbox token
```

## Steps to Take
1. Update the .env file to use `VITE_MAPBOX_TOKEN` instead of `MAPBOX_TOKEN`
2. Update the mapbox.ts utility file to use `import.meta.env.VITE_MAPBOX_TOKEN` instead of `import.meta.env.MAPBOX_TOKEN`
3. Update the config.ts file to use `import.meta.env.VITE_MAPBOX_TOKEN` instead of `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`
4. Restart the development server to apply the changes

## Current Execution Step
Completed

## Important Notes
- Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client-side code
- The application uses a mix of Next.js and Vite environment variable patterns, which should be standardized
- The Mapbox token is used in multiple places in the codebase, so all references need to be updated

## Task Progress
- 2025-03-15 [SUCCESSFUL]: Identified the root cause of the Mapbox token loading issue
- 2025-03-15 [SUCCESSFUL]: Updated the .env file to use `VITE_MAPBOX_TOKEN` instead of `MAPBOX_TOKEN`
- 2025-03-15 [SUCCESSFUL]: Updated the mapbox.ts utility file to use `import.meta.env.VITE_MAPBOX_TOKEN`
- 2025-03-15 [SUCCESSFUL]: Updated the config.ts file to use `import.meta.env.VITE_MAPBOX_TOKEN`
- 2025-03-15 [SUCCESSFUL]: Restarted the development server to apply the changes
- 2025-03-15 [SUCCESSFUL]: Verified that the Mapbox token is now loading correctly

## Final Review
- Summary of changes:
  - Updated the .env file to use `VITE_MAPBOX_TOKEN` instead of `MAPBOX_TOKEN`
  - Updated the mapbox.ts utility file to use `import.meta.env.VITE_MAPBOX_TOKEN` instead of `import.meta.env.MAPBOX_TOKEN`
  - Updated the config.ts file to use `import.meta.env.VITE_MAPBOX_TOKEN` instead of `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`
  - Restarted the development server to apply the changes
- Impact:
  - The Mapbox token is now loading correctly in the frontend application
  - The Map component is now functioning properly
  - Consistent environment variable naming across the codebase
- Future improvements:
  - Standardize all environment variable access patterns to use Vite's `import.meta.env` approach
  - Add validation for all required environment variables at application startup
  - Consider using a centralized configuration module to manage all environment variables 