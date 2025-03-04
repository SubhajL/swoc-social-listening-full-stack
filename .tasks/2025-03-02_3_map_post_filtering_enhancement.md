# Map Post Filtering Enhancement

## Task Description
Enhance the post filtering logic in the Map component to ensure posts with only tumbon information (without amphure or province) are not displayed on the map. This improves the accuracy of the map visualization by only showing posts with sufficient location data.

## Branch Information
- **Branch**: feature/settings-rbac
- **Status**: Completed
- **Date**: 2025-03-02

## Changes Made

### 1. Frontend Changes

#### 1.1 Enhanced `hasValidCoordinates` Function
- **File**: `apps/frontend/src/utils/coordinates.ts`
- **Changes**:
  - Added strict validation to ensure posts must have both amphure AND province information
  - Improved error handling and added detailed logging
  - Refactored the function to use more modern TypeScript syntax
  - Added checks to filter out posts with only tumbon information, regardless of coordinates

#### 1.2 Enhanced `loadMapPosts` Function
- **File**: `apps/frontend/src/utils/map-core.ts`
- **Changes**:
  - Added pre-filtering step to explicitly filter out posts with only tumbon information
  - Added detailed logging to track posts being filtered out
  - Added metrics to count posts by location data availability
  - Added final verification to ensure no posts with only tumbon information make it through
  - Enhanced logging to provide better debugging information

### 2. Backend Changes

#### 2.1 Modified `getUnprocessedPosts` Method
- **File**: `apps/backend/src/services/processed-post.service.ts`
- **Changes**:
  - Added logic to skip posts with only tumbon information (no amphure or province)
  - Added logging to track posts being filtered out
  - Ensured the location cache is only used for posts with both amphure AND province
  - Added metrics to track how many posts are filtered out due to insufficient location data

## Testing
- Verified that posts with only tumbon information are not displayed on the map
- Confirmed that posts with both amphure and province information are correctly displayed
- Added detailed logging to help diagnose any issues that might arise

## Technical Details

### Filtering Logic
1. **Backend Filtering**:
   - Posts with only tumbon information are skipped during processing
   - Location cache is only used for posts with both amphure AND province

2. **Frontend Filtering**:
   - Pre-filtering step explicitly removes posts with only tumbon information
   - `hasValidCoordinates` function provides an additional layer of validation
   - Final verification ensures no posts with only tumbon information make it through

### Logging Enhancements
- Added detailed logging to track:
  - Total number of posts fetched from API
  - Posts with direct coordinates
  - Posts with amphure and province but no coordinates
  - Posts with only tumbon information
  - Posts with no location data
  - Posts with only tumbon but have coordinates (from backend cache)
  - Posts filtered out at each step

## Known Issues
- None identified. The implementation successfully filters out posts with only tumbon information.

## Future Improvements
- Consider adding a user interface option to toggle this filtering behavior
- Add more detailed metrics about the quality of location data
- Enhance the location cache to provide more accurate coordinates for administrative locations

## Conclusion
This enhancement improves the accuracy of the map visualization by ensuring that only posts with sufficient location data (both amphure AND province) are displayed on the map. The changes include multiple layers of filtering and detailed logging to help diagnose any issues that might arise. 