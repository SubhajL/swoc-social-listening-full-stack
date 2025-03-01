# TMD Data Integration Recommendation

## Analysis Summary

We've analyzed the data structures from both the Hydro and Informatics Institute (HII) and the Thai Meteorological Department (TMD) APIs to determine the best approach for database integration.

### Station Data Comparison

| Feature | HII Stations | TMD Stations |
|---------|-------------|-------------|
| Total Records | 1342 | 1294 |
| Common Fields | 6 fields | 6 fields |
| Unique Fields | 6 fields | 0 fields |
| Compatibility Score | 50% | 50% |

**Common Fields:**
- agency_id
- id (tele_station_id)
- tele_station_lat
- tele_station_long
- tele_station_name (object with th/en properties)
- tele_station_oldcode

**Fields Only in HII Stations:**
- ground_level
- is_warning
- left_bank
- right_bank
- tele_station_offset
- tele_station_type

### Rainfall Data Comparison

| Feature | HII Rainfall | TMD Rainfall |
|---------|-------------|-------------|
| Total Records | 571 | 123 |
| Common Fields | 4 fields | 4 fields |
| Unique Fields | 3 fields | 1 field |
| Compatibility Score | 57.14% | 57.14% |

**Common Fields:**
- rainfall24h
- rainfall_date_calc
- rainfall_datetime
- tele_station_id

**Fields Only in HII Rainfall:**
- rainfall10m
- rainfall1h
- rainfall_today

**Fields Only in TMD Rainfall:**
- rainfall3h

## Key Observations

1. **Station Data:**
   - TMD stations have a simpler structure with fewer fields
   - HII stations include additional fields for water level monitoring (ground_level, left_bank, right_bank)
   - Both use the same basic identification and location fields
   - TMD stations often have empty English names

2. **Rainfall Data:**
   - Both measure rainfall over different time periods
   - HII measures 10min, 1h, and 24h intervals
   - TMD measures 3h and 24h intervals
   - Both use the same datetime format and reference the same station ID system

3. **Agency Differences:**
   - HII (agency_id: 9) focuses on water management with more detailed station attributes
   - TMD (agency_id: 13) focuses on meteorological data with simpler station attributes

## Recommendations

Based on our analysis, we recommend the following approach:

### Option 1: Unified Tables with Agency Identifier (Recommended)

Use the existing tables with minor modifications:

1. **For thaiwater_tele_stations table:**
   - Keep all existing fields
   - Add a new field `data_source` (VARCHAR) to identify the source agency ("HII" or "TMD")
   - Use NULL values for TMD stations where HII-specific fields don't apply

2. **For thaiwater_rainfall_data table:**
   - Keep all existing fields
   - Add `rainfall3h` field to accommodate TMD data
   - Add a `data_source` field to identify the source agency

**Advantages:**
- Single unified view of all stations and rainfall data
- Simpler queries for applications that don't need to distinguish between sources
- Easier to maintain and extend

**Implementation:**
```sql
-- Modify stations table
ALTER TABLE thaiwater_tele_stations 
ADD COLUMN data_source VARCHAR(10);

-- Update existing records
UPDATE thaiwater_tele_stations 
SET data_source = 'HII';

-- Modify rainfall data table
ALTER TABLE thaiwater_rainfall_data 
ADD COLUMN rainfall3h DECIMAL(10, 2),
ADD COLUMN data_source VARCHAR(10);

-- Update existing records
UPDATE thaiwater_rainfall_data 
SET data_source = 'HII';
```

### Option 2: Separate Tables for Each Agency

Create new tables specifically for TMD data:

1. **Create tmd_tele_stations table**
2. **Create tmd_rainfall_data table**

**Advantages:**
- Clear separation between data sources
- No need to handle NULL values for agency-specific fields
- Can optimize each table structure for its specific data

**Disadvantages:**
- Requires duplicate code for data handling
- More complex queries when needing data from both sources
- More tables to maintain

## Implementation Plan

We recommend implementing Option 1 (Unified Tables) with the following steps:

1. Modify the existing tables to add the new fields
2. Update the data service to handle both HII and TMD APIs
3. Create a new script to fetch and insert TMD station data
4. Create a new script to fetch and insert TMD rainfall data
5. Update the API endpoints to support filtering by data source

This approach provides the most flexibility while minimizing code duplication and maintenance overhead.

## Next Steps

1. Implement the recommended database changes
2. Create TMD-specific service functions
3. Update the synchronization scripts to handle both data sources
4. Update the API documentation to reflect the new data source 