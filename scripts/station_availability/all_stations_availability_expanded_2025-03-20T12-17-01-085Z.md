# Comprehensive Station Availability Report (With Expanded Station IDs)
Generated: 2025-03-20T12:17:01.089Z

## Overview

This report analyzes the availability of telemetry data for all 625 unique stations across the RID API and PostgreSQL database, using the expanded station code to ID mapping.

## Test Configuration
- **Mapping Type**: Expanded (includes newly mapped stations)
- **Test Started**: 2025-03-20T12:04:32.682Z
- **Test Completed**: 2025-03-20T12:17:01.084Z
- **Duration**: 12 minutes, 28 seconds
- **Batch Size**: 20 stations
- **Delay Between Batches**: 2 seconds

## Summary Statistics

| Category | Count | Tested | Skipped | Success | With Data | No Data | Error |
|----------|-------|--------|---------|---------|-----------|---------|-------|
| **API-only** | 47 | 43 | 4 | 43 (100%) | 43 (100%) | 0 (0%) | 0 (0%) |
| **Common** | 320 | 320 | 0 | 320 (100%) | 308 (96%) | 12 (4%) | 0 (0%) |
| **DB-only** | 258 | 248 | 10 | 248 (100%) | 22 (9%) | 226 (91%) | 0 (0%) |
| **TOTAL** | 625 | 611 | 14 | 611 (100%) | 373 (61%) | 238 (39%) | 0 (0%) |

## Mapping Coverage

This test used the expanded station mapping, which covers approximately 98% of all stations.

## Data Availability Analysis

### Stations with Data (Sample)

Below is a sample of stations with available telemetry data:

#### Station: 01 (ID: 609) - API-only

- **Data Count**: 1 records
- **Sample Data**:
  - Timestamp: /Date(1742425200000+0700)/

#### Station: 02 (ID: 610) - API-only

- **Data Count**: 1 records
- **Sample Data**:
  - Timestamp: /Date(1742425200000+0700)/

#### Station: 03 (ID: 611) - API-only

- **Data Count**: 1 records
- **Sample Data**:
  - Timestamp: /Date(1742425200000+0700)/

#### Station: 04 (ID: 607) - API-only

- **Data Count**: 1 records
- **Sample Data**:
  - Timestamp: /Date(1742425200000+0700)/

#### Station: 05 (ID: 608) - API-only

- **Data Count**: 1 records
- **Sample Data**:
  - Timestamp: /Date(1742425200000+0700)/

#### Station: C.30 (ID: 324) - API-only

- **Data Count**: 1 records
- **Sample Data**:
  - Timestamp: /Date(1742425200000+0700)/

#### Station: E.2A (ID: 190) - API-only

- **Data Count**: 4 records
- **Sample Data**:
  - Timestamp: /Date(1742457600000+0700)/

#### Station: E.95A (ID: 213) - API-only

- **Data Count**: 4 records
- **Sample Data**:
  - Timestamp: /Date(1742457600000+0700)/

#### Station: K.56A (ID: 651) - API-only

- **Data Count**: 18 records
- **Sample Data**:
  - Timestamp: /Date(1742468400000+0700)/

#### Station: Kgt.34 (ID: 366) - API-only

- **Data Count**: 5 records
- **Sample Data**:
  - Timestamp: /Date(1742468400000+0700)/

## Recommendations

1. **Focus on High-Value Stations**: Prioritize stations in both the API and database (320 stations) as they appear to be the most reliable.

2. **API-Only Stations**: Add the 47 API-only stations to the database, especially the 43 stations with real-time data.

3. **DB-Only Stations**: Review the 258 database-only stations:
   - For the 22 stations with data, ensure proper integration
   - For the 226 stations without data, consider marking as inactive

4. **Data Availability**: Overall, 373 stations (61%) had available telemetry data at the time of testing.

5. **Mapping Improvement**: 14 stations were skipped because they didn't have a numeric ID mapping. Continue improving the station mapping.

## Next Steps

1. Finalize the station mapping for the remaining 14 unmapped stations
2. Setup regular monitoring of data availability across all stations 
3. Integrate the 43 API-only stations with data into the database
4. Consider archiving or marking inactive the 238 stations without data
