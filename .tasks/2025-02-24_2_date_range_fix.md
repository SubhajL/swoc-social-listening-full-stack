# Date Range Fix

## Description
Fixed the date range selection in the filter panel to correctly handle month boundaries and time zones.

## Changes Made
1. Updated date handling to use Day.js with proper timezone handling
2. Fixed "เดือนนี้" (This Month) to correctly show from 01/02/2025 to 24/02/2025
3. Fixed "เดือนที่แล้ว" (Last Month) to correctly show from 01/01/2025 to 31/01/2025
4. Added proper timezone handling for Bangkok time (UTC+7)
5. Fixed date calculations to avoid off-by-one issues at month boundaries

## Files Modified
- apps/frontend/src/components/filters/FilterPanel.tsx

## Status
✅ Completed

## Testing
- Verified that "เดือนนี้" shows correct date range (01/02/2025 - 24/02/2025)
- Verified that "เดือนที่แล้ว" shows correct date range (01/01/2025 - 31/01/2025)
- Verified that timezone handling works correctly for Bangkok time 