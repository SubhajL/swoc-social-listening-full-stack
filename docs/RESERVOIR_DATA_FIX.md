# Reservoir Data Synchronization Fix

## Problem Statement

The reservoir data synchronization process was failing due to a type mismatch between the reservoir IDs in the API response and the database schema. The API returns reservoir IDs in string format (e.g., "rsv123"), but the database was attempting to use these as numeric IDs, causing errors during data insertion and updates.

## Solution Implemented

We implemented the following changes to fix the issue:

1. **Database Schema Update**: Changed the `reservoir_data` table to use `VARCHAR(20)` for the `reservoir_id` column to properly store the string format IDs.

2. **Unique Constraint Addition**: Added a unique constraint on the combination of `reservoir_id` and `date` columns to prevent duplicate entries and ensure data integrity.

3. **Script Modification**: Updated the `sync-reservoir-data.mjs` script to correctly handle the string format IDs and properly reference the `reservoir_id` column for data operations.

## Scripts Created for the Fix

### 1. Fix Reservoir Schema Script

**File**: `apps/backend/src/scripts/fix-reservoir-data-schema.mjs`

This script modifies the database schema to ensure the `reservoir_id` column is defined as `VARCHAR(20)` instead of `INTEGER`. This allows storing the string format IDs properly.

### 2. Add Reservoir Constraint Script

**File**: `apps/backend/src/scripts/add-reservoir-constraint.mjs`

This script:
- Checks for duplicate entries in the `reservoir_data` table based on `reservoir_id` and `date`
- Removes duplicates by keeping only the most recently updated entry
- Adds a unique constraint on the `reservoir_id` and `date` columns
- Tests the constraint by attempting a conflicting insert with an ON CONFLICT clause

### 3. Check Reservoir Constraint Script

**File**: `apps/backend/src/scripts/check-reservoir-constraint.mjs`

This script examines the database to verify that:
- The `reservoir_data` table has the correct column types
- The unique constraint on `reservoir_id` and `date` exists
- The constraint works correctly with an ON CONFLICT test

### 4. Restart Scheduler Script

**File**: `apps/backend/src/scripts/restart-scheduler.sh`

This script:
- Stops the currently running scheduler
- Starts a new scheduler instance
- Runs an immediate reservoir data sync to test the fix

## Verifying the Fix

To verify that the fix is working properly:

1. Run the check constraint script:
   ```
   node src/scripts/check-reservoir-constraint.mjs
   ```
   This should show that the unique constraint exists on the `reservoir_id` and `date` columns.

2. Run the reservoir sync script:
   ```
   npm run sync:reservoir
   ```
   The script should complete without errors, successfully inserting or updating reservoir data.

3. Check the logs to verify that reservoirs are being processed correctly with their string IDs.

4. Query the database to ensure that data has been properly inserted with the string format IDs.

## Scheduler Integration

The reservoir data synchronization is scheduled as part of the main scheduler configuration. With this fix, the scheduler should now be able to run the reservoir data sync without errors.

To restart the scheduler after making these changes, use the restart-scheduler script:
```
./src/scripts/restart-scheduler.sh