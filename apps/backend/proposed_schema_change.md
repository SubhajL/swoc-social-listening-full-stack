# Proposed Schema Change for Reservoir Data

## Current Issues
- The current design is complex, using numeric IDs and fuzzy name matching
- `reservoir_data.reservoir_id` is an integer that references `reservoir_locations.id`
- API returns string IDs like "rsv123" which need to be mapped to numeric IDs
- Fuzzy name matching can lead to incorrect mappings
- Extra database queries required for lookups

## Proposed Solution
Create a new schema that directly uses the API's reservoir_id:

```sql
CREATE TABLE reservoir_data_new (
  id SERIAL PRIMARY KEY,
  reservoir_id VARCHAR(20) NOT NULL,
  reservoir_name VARCHAR(255) NOT NULL,
  storage NUMERIC(15,2),
  dead_storage NUMERIC(15,2),
  volume NUMERIC(15,2),
  inflow NUMERIC(15,2),
  outflow NUMERIC(15,2),
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_reservoir_data_new_reservoir_id ON reservoir_data_new(reservoir_id);
CREATE INDEX idx_reservoir_data_new_date ON reservoir_data_new(date);
CREATE INDEX idx_reservoir_data_new_type ON reservoir_data_new(type);
```

## Migration Steps
1. Create the new table
2. Migrate existing data with a join to get the string IDs
3. Verify the migration
4. Swap the tables
5. Update the sync script

## Sync Script Changes
The script would be simplified to:
1. Get reservoir data from API
2. Use the API's reservoir ID directly
3. No need for fuzzy name matching

## Benefits
- Simpler schema
- Direct 1:1 mapping with API data
- No need for complex joins or fuzzy matching
- Reduces risk of data errors
- Faster performance
- Easier to maintain

## Implementation Note
This is a breaking change that would require coordination with any code that uses this database structure. 