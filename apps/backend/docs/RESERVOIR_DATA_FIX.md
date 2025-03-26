# Reservoir Data Update Issue and Fix

## Problem Overview

The reservoir data table (`reservoir_data`) stopped updating as of March 23, 2025. After investigation, we identified the following issues:

1. **Schema Mismatch**: The `reservoir_data` table has a foreign key constraint that references `reservoir_locations(id)` with an integer type, but the API response uses string IDs like "rsv123".

2. **Foreign Key Violation**: The sync script was attempting to insert string IDs from the API directly into the `reservoir_id` field, which was causing foreign key constraint violations.

3. **Silent Failures**: The sync process was failing silently, with all reservoirs showing errors but the overall process reporting successful completion.

## Root Cause

The root cause of the issue is a data type mismatch in the `reservoir_id` field:

- In `reservoir_locations`, we have both an integer `id` field and a string `reservoir_id` field that stores the original API ID.
- In `reservoir_data`, the `reservoir_id` field is an integer with a foreign key to `reservoir_locations(id)`.
- The sync script incorrectly tries to use the string API IDs directly in `reservoir_data.reservoir_id`.

## Solution

We have implemented two solutions:

### 1. Short-term Fix (Updated Sync Script)

The sync script (`sync-reservoir-data.mjs`) has been updated to:

- Look up the numeric ID from `reservoir_locations` using the API's string ID
- Use the numeric ID when inserting/updating data in `reservoir_data`
- Improve error logging to show the actual errors
- Handle cases where there's no matching `reservoir_locations` record by temporarily dropping the foreign key constraint

### 2. Long-term Fix (Schema Change)

A permanent solution involves changing the schema to match how the API works:

- Create a new `reservoir_data` table with `reservoir_id` as VARCHAR(20)
- Migrate existing data from the old table to the new one
- Remove the foreign key constraint to simplify the data flow
- Add appropriate indexes for performance

This permanent fix is implemented in the `fix-reservoir-data-schema.mjs` script.

## How to Apply the Fix

### Step 1: Update the Sync Script

The sync script has already been updated to handle the ID mismatch. This will allow the sync process to work correctly even with the current schema.

### Step 2: Apply the Schema Fix (Optional but Recommended)

To apply the permanent schema fix:

```bash
cd apps/backend
npm run fix:reservoir-schema
```

This will:
1. Create a new table with the correct schema
2. Migrate existing data
3. Swap the tables
4. Update sequences and constraints

### Step 3: Run the Sync Process Manually

After applying the fix, run the sync process manually to verify it works:

```bash
cd apps/backend
npm run sync:reservoir
```

## Verification

To verify the fix is working:

1. Check the logs for any errors
2. Query the database to see if new data is being inserted
3. Verify the data in the API response

```sql
-- Check the most recent data
SELECT * FROM reservoir_data ORDER BY date DESC, updated_at DESC LIMIT 10;

-- Check data count per date
SELECT date, count(*) FROM reservoir_data GROUP BY date ORDER BY date DESC;
```

## Future Considerations

- Consider simplifying other schema designs to more directly match API responses
- Add more robust validation in sync scripts
- Implement better error handling and reporting
- Set up monitoring to detect sync failures earlier

## Related Changes

- Updated `sync-reservoir-data.mjs` to handle ID mapping
- Created `fix-reservoir-data-schema.mjs` for the permanent fix
- Added npm script `fix:reservoir-schema` to package.json 