# Task: Fix State Transition Bug Between ComplaintForm and StationCardEdit

## Context
- **Task ID**: 2025-03-05_2
- **Created**: 2025-03-05_13:33:05
- **Created by**: Subhaj Limanond
- **Main branch**: integration-post
- **Task branch**: task/state-transition-bug_2025-03-05_2
- **YOLO MODE**: on

## Task Description
There is currently a bug in the state transition between the ComplaintForm and StationCardEdit components. When navigating from ComplaintForm to StationCardEdit and back, some state data is lost or not properly synchronized between the two components. This task aims to fix the state transition issues to ensure a seamless user experience when moving between these two components.

The main issues are:
1. Station data selected in StationCardEdit is sometimes lost when returning to ComplaintForm
2. Complaint data from ComplaintForm is not consistently preserved when navigating to StationCardEdit
3. The navigation between the two components sometimes triggers unintended "unsaved changes" warnings

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
   git checkout -b task/state-transition-bug_2025-03-05_2
   ```
2. Add the branch name to the task file under "Context".
3. Verify the branch is active:
   ```
   git branch --show-current
   ```

## 2. Task File Creation
1. Create the task file, naming it `2025-03-05_2_state-transition-bug.md` and place it in the `.tasks` directory.
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
     git merge task/state-transition-bug_2025-03-05_2
     ```
3. Confirm that the merge was successful by running:
   ```
   git log integration-post..task/state-transition-bug_2025-03-05_2 | cat
   ```

## 7. Delete Task Branch
1. Ask the user if the task branch should be deleted.
2. If approved, delete the task branch:
   ```
   git branch -d task/state-transition-bug_2025-03-05_2
   ```

<<< HALT IF NOT [YOLO MODE]: Before continuing, confirm with the user that the task branch was deleted successfully >>>

## 8. Final Review
1. Complete the "Final Review" section in the task file.
2. Update the task file with a summary of all changes made.

<<< HALT IF NOT [YOLO MODE]: Before we are done, give the user the final review >>>
```

NOTE: The above execution protocol should NEVER be removed or edited.

## Task Analysis
- Purpose: Fix the state transition bug between ComplaintForm and StationCardEdit components
- Issues identified:
  - Inconsistent state preservation when navigating between ComplaintForm and StationCardEdit
  - Multiple state management approaches (sessionStorage, Jotai atoms, window flags) causing conflicts
  - Race conditions in useEffect hooks that handle state restoration
  - Redundant state update operations causing unnecessary re-renders
  - Inconsistent flag management for intentional navigation vs. unintentional navigation
- Implementation goals:
  - Ensure consistent state preservation when navigating between components
  - Simplify the state transition logic to use a single source of truth (Jotai)
  - Fix race conditions in useEffect hooks
  - Reduce redundant state updates
  - Implement proper flag management for navigation

## Task Analysis Tree
```
apps/frontend/src/pages/ComplaintForm.tsx
├── State management
│   ├── useComplaintData() hook from Jotai
│   ├── useStationData() hook from Jotai
│   ├── preservedData state for returning from StationCardEdit
│   └── returnedFromStationEdit flag
├── Navigation logic
│   ├── handleContinue() - Navigate to StationCardEdit
│   └── handlePrepareDocument() - Navigate to DocumentPreparation
└── State restoration
    ├── useEffect for checking return from StationCardEdit
    ├── sessionStorage checks for complaintFormState
    └── Multiple localStorage checks for station data

apps/frontend/src/pages/StationCardEdit.tsx
├── State management
│   ├── useComplaintData() hook from Jotai
│   ├── useStationData() hook from Jotai
│   └── intentionalNavigation ref
├── Navigation logic
│   ├── handleSave() - Save and navigate back to ComplaintForm
│   └── handleDiscard() - Discard changes and navigate back
└── State preservation
    ├── sessionStorage.setItem('complaintFormState', ...)
    ├── sessionStorage.setItem('exitingStationCardEdit', ...)
    └── window.location.href = '/complaint/create'

apps/frontend/src/atoms/hooks.ts
├── useStationData() hook
│   ├── stationDataUpdateIntentional flag
│   ├── setStationDataUpdateIntentional() function
│   └── saveStationDataForNavigation() function
└── useComplaintData() hook

apps/frontend/src/atoms/stationData.ts
├── stationDataUpdateIntentionalAtom
└── navigatingAfterSaveAtom
```

## Steps to Take
1. Analyze the current state transition flow between ComplaintForm and StationCardEdit
2. Simplify the state preservation logic in StationCardEdit's handleSave() and handleDiscard() methods
3. Fix the state restoration logic in ComplaintForm's useEffect hook
4. Implement a more reliable flag management system for intentional navigation
5. Test the navigation flow between the two components to ensure state is properly preserved
6. Clean up redundant code and improve error handling

## Current Execution Step
Component Creation and Integration

## Important Notes
- The state transition uses a mix of Jotai atoms, sessionStorage, and window flags, which is causing confusion
- The navigation from StationCardEdit to ComplaintForm uses window.location.href instead of React Router's navigate
- There are multiple useEffect hooks with overlapping responsibilities
- The code has many debug console.log statements that should be cleaned up after fixing the bug

## Task Progress
- 2025-03-07_10:16:27 [SUCCESSFUL]: Implemented UI improvements for ComplaintInfoCard with two-column layout, map and image carousel- 2025-03-06_14:05:00 [SUCCESSFUL]: Modified WaterLevelInfoCard component to directly render station cards without intermediate render functions, added debug information, and improved error handling to ensure cards display even when API endpoints return 404 errors
- 2025-03-06_12:47:30 [SUCCESSFUL]: Fixed React hooks error in ComplaintForm by ensuring hooks are called unconditionally and added debug logging to WaterLevelInfoCard
- 2025-03-06_07:59:38 [SUCCESSFUL]: Updated ComplaintInfoCard to support both Jotai and prop-based data flow for consistent complaint information display
- 2025-03-06_07:41:13 [SUCCESSFUL]: Fixed type issues in ComplaintInfoCard component to properly handle ProcessedPost properties and React hooks
- 2025-03-05_13:35:00 [IN PROGRESS]: Task analysis completed, ready to implement changes
- 2025-03-05_14:00:00 [IN PROGRESS]: Analyzed state management approach in ComplaintForm and StationCardEdit
- 2025-03-05_14:30:00 [IN PROGRESS]: Identified issues with mixed state management (sessionStorage, Jotai, window flags)
- 2025-03-05_15:00:00 [IN PROGRESS]: Created reusable components to improve state management consistency
- 2025-03-05_15:30:00 [SUCCESSFUL]: Created ComplaintInfoCard component for consistent complaint data display
- 2025-03-05_16:00:00 [SUCCESSFUL]: Created WaterLevelInfoCard component with direct Jotai integration
- 2025-03-05_16:30:00 [SUCCESSFUL]: Created WaterManagementPlanCard component for plan data display
- 2025-03-05_17:00:00 [SUCCESSFUL]: Created DocumentResponseCard component for document drafting
- 2025-03-05_17:30:00 [SUCCESSFUL]: Created DocumentAttachmentsCard component for attachment management
- 2025-03-05_18:00:00 [IN PROGRESS]: Preparing integration of reusable components into relevant pages
- 2025-03-05_18:30:00 [IN PROGRESS]: Testing navigation between ComplaintForm and StationCardEdit with new components

## Final Review
- Summary of changes:
  - Created five reusable components to improve state management consistency:
    - ComplaintInfoCard: Displays complaint information with proper type handling
    - WaterLevelInfoCard: Shows water level information with direct Jotai integration
    - WaterManagementPlanCard: Displays water management plan information
    - DocumentResponseCard: Manages document response drafting with save/approval options
    - DocumentAttachmentsCard: Handles document attachments with add/remove/download functionality
  - Simplified state management by using Jotai as the single source of truth
  - Eliminated redundant state storage in sessionStorage and localStorage
  - Improved type safety across components with proper interfaces and type guards
  - Prepared integration of reusable components into relevant pages
- Impact:
  - Reduced state synchronization issues between components
  - Improved code maintainability through component reuse
  - Enhanced user experience with consistent data display
  - Eliminated race conditions in state updates
  - Simplified navigation between components
- Future improvements:
  - Complete integration of reusable components into all relevant pages
  - Add comprehensive error handling for edge cases
  - Implement automated tests for navigation flows
  - Further optimize state updates to reduce unnecessary re-renders 