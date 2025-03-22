# Comprehensive Station Availability Report (With Correct Station IDs)
Generated: 2025-03-20T11:58:30.352Z

## Overview

This report analyzes the availability of telemetry data for all 625 unique stations across the RID API and PostgreSQL database, using the correct numeric station IDs for API requests.

## Test Configuration
- **Test Started**: 2025-03-20T11:50:33.287Z
- **Test Completed**: 2025-03-20T11:58:30.349Z
- **Duration**: 7 minutes, 57 seconds
- **Batch Size**: 20 stations
- **Delay Between Batches**: 2 seconds

## Summary Statistics

| Category | Count | Tested | Skipped | Success | With Data | No Data | Error |
|----------|-------|--------|---------|---------|-----------|---------|-------|
| **API-only** | 47 | 43 | 4 | 43 (100%) | 43 (100%) | 0 (0%) | 0 (0%) |
| **Common** | 320 | 319 | 1 | 319 (100%) | 308 (97%) | 11 (3%) | 0 (0%) |
| **DB-only** | 258 | 16 | 242 | 16 (100%) | 13 (81%) | 3 (19%) | 0 (0%) |
| **TOTAL** | 625 | 378 | 247 | 378 (100%) | 364 (96%) | 14 (4%) | 0 (0%) |

## API Station ID Usage

The RID Telemetry API requires numeric station IDs (like "7" or "40") rather than station codes (like "G.9" or "P.67"). This test used the station code to station ID mapping to correctly query the API.

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
   - For the 13 stations with data, ensure proper integration
   - For the 3 stations without data, consider marking as inactive

4. **Data Availability**: Overall, 364 stations (96%) had available telemetry data at the time of testing.

5. **ID Mapping**: 247 stations were skipped because they didn't have a numeric ID mapping. Consider updating the station mapping file.

## Next Steps

1. Setup regular monitoring of data availability across all stations
2. Integrate the 43 API-only stations with data into the database
3. Consider archiving or marking inactive the 14 stations without data
4. Complete the station ID mapping for the 247 skipped stations
