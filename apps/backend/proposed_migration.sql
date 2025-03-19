-- Create the new table
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

-- Migrate data from old to new schema
-- Join with reservoir_locations to get the string reservoir_id
INSERT INTO reservoir_data_new (
  reservoir_id,
  reservoir_name,
  storage,
  dead_storage,
  volume,
  inflow,
  outflow,
  date,
  type,
  created_at,
  updated_at
)
SELECT 
  rl.reservoir_id,  -- Use the string reservoir_id from reservoir_locations
  rd.reservoir_name,
  rd.storage,
  rd.dead_storage,
  rd.volume,
  rd.inflow,
  rd.outflow,
  rd.date,
  rd.type,
  rd.created_at,
  rd.updated_at
FROM reservoir_data rd
JOIN reservoir_locations rl ON rd.reservoir_id = rl.id;

-- Verify the migration
SELECT COUNT(*) FROM reservoir_data;
SELECT COUNT(*) FROM reservoir_data_new;

-- If counts match, swap the tables
-- This is a safe way to rename tables in PostgreSQL
BEGIN;

ALTER TABLE reservoir_data RENAME TO reservoir_data_old;
ALTER TABLE reservoir_data_new RENAME TO reservoir_data;

-- Rename the sequences and constraints if needed
ALTER SEQUENCE reservoir_data_id_seq RENAME TO reservoir_data_old_id_seq;
ALTER SEQUENCE reservoir_data_new_id_seq RENAME TO reservoir_data_id_seq;

COMMIT;

-- After verifying everything works, you can drop the old table
-- DROP TABLE reservoir_data_old; 