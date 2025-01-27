# Context
Task file name: 2024-01-22_update_lat_long_new_tables.md
Created at: 2024-01-22_14:30:00
Created by: Otto
Main branch: task/location-data-population_2025-01-22_3
Task Branch: task/location-lat-long-population_2024-01-22_1
YOLO MODE: on

# Task Description
Update the lat/long coordinates in provinces_new and amphures_new tables by querying the Google Maps API with specific location formats:

For Provinces:
- If Bangkok: "ศาลาว่าการกรุงเทพมหานคร"
- Others: "ศาลากลางจังหวัด{normalizedNameTh}"

For Amphures:
- If in Bangkok: "สำนักงานเขต{normalizedNameTh}"
- Others: "ที่ว่าการอำเภอ{normalizedNameTh}"

The Thai names in both tables are already properly encoded and normalized.

# Project Overview
A social monitoring and automated response generation platform for severe water-related incidents such as flooding, drought, as well as other generic questions and requests for the Royal Irrigation Department (RID) of Thailand.

# Original Execution Protocol
[NOTE: This section should NEVER be removed or edited]
```
// ... existing code ...
[Full Execution Protocol content here]
// ... existing code ...
```

# Task Analysis
- Purpose: Add geographical coordinates to provinces_new and amphures_new tables
- Issues identified:
  - Need to update new tables instead of old ones
  - Must handle rate limiting and API quotas
  - Need to validate coordinates are within Thailand
  - Must handle transaction rollback on errors
- Implementation goals:
  - Use existing Google Maps API setup
  - Implement proper error handling and retries
  - Add transaction support for atomic updates
  - Log all operations for monitoring

# Task Analysis Tree
- src/scripts/update_location_data_final.ts
  - Main script to be modified for new tables
  - Contains working Google Maps API integration
  - Has proper error handling and retry logic
  - Includes Thailand boundary validation
- apps/backend/.env
  - Contains Google Maps API key
  - Database credentials
- Database Tables:
  - provinces_new
    - Already has correct Thai names
    - Needs lat/long columns updated
  - amphures_new
    - Already has correct Thai names
    - Needs lat/long columns updated

# Steps to take
1. Create new script update_location_data_new_tables.ts
2. Modify database queries to target new tables
3. Reuse existing Google Maps API integration
4. Add transaction support for atomic updates
5. Implement logging and error handling
6. Add progress tracking for long-running operations
7. Test with sample data before full run

# Current execution step: 2

# Important Notes
- Thai names are already properly encoded in new tables
- Use transaction for atomic updates
- Validate all coordinates are within Thailand
- Log all operations and errors
- Handle API rate limits with exponential backoff

# Task Progress
[2024-01-22 14:30:00] Starting implementation of new script for updating lat/long in new tables.
[2024-01-22 14:35:00] Created update_location_data_new_tables.ts with the following improvements:
- Modified queries to target provinces_new and amphures_new tables
- Removed Thai text normalization since names are already properly encoded
- Added transaction support for atomic updates
- Enhanced error handling and logging
- Implemented exponential backoff for rate limiting
- Added progress tracking for each operation

# Final Review
[To be filled after completion]

# Update Lat/Long for New Tables

## Objective
Update latitude and longitude coordinates for provinces and amphures in the new tables structure.

## Progress

### 2024-01-27
- Successfully updated coordinates for provinces and amphures using Google Maps Geocoding API
- Fixed issues with missing locations by trying different search patterns
- Verified data in tables:
  - provinces_new: 77 records
  - amphures_new: 928 records
  - tumbons: 7,364 records
- All amphures now have coordinates, including previously missing ones:
  - อำเภอแว้ง (5.918450, 101.866362)
  - อำเภอจะแนะ (5.987041, 101.570281)
  - อำเภอท่าพ (10.756420, 99.101350)

### 2024-01-22
- Created new tables structure
- Added initial data migration script
- Set up Google Maps API integration

## Files Modified
- src/scripts/update_location_data_new_tables.js
- src/scripts/check_records.js

## Next Steps
- [ ] Review and validate all coordinates
- [ ] Add error handling for edge cases
- [ ] Update documentation 