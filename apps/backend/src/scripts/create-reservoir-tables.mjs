import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Creates the reservoir tables in the PostgreSQL database
 */
async function createReservoirTables() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    logger.info('[CreateReservoirTables] Connecting to database');
    await client.connect();
    logger.info('[CreateReservoirTables] Connected to database');

    // Create the reservoir_locations table
    logger.info('[CreateReservoirTables] Creating reservoir_locations table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservoir_locations (
        reservoir_id INT PRIMARY KEY,
        reservoir_name VARCHAR(255) NOT NULL,
        reservoir_name_ VARCHAR(255),
        reservoir_lat NUMERIC(10, 6),
        reservoir_long NUMERIC(10, 6),
        agency_id INT,
        ground_level NUMERIC(10, 2),
        left_bank NUMERIC(10, 2),
        right_bank NUMERIC(10, 2),
        is_warning BOOLEAN,
        province VARCHAR(100),
        amphure VARCHAR(100),
        tambon VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        data_source VARCHAR(10)
      );
    `);
    logger.info('[CreateReservoirTables] reservoir_locations table created successfully');

    // Create the reservoir_data table
    logger.info('[CreateReservoirTables] Creating reservoir_data table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservoir_data (
        id SERIAL PRIMARY KEY,
        reservoir_id INT NOT NULL,
        reservoir_name VARCHAR(255) NOT NULL,
        storage NUMERIC(15, 2),
        dead_storage NUMERIC(15, 2),
        volume NUMERIC(15, 2),
        inflow NUMERIC(15, 2),
        outflow NUMERIC(15, 2),
        date DATE NOT NULL,
        type VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reservoir_id) REFERENCES reservoir_locations(id)
      );
    `);
    logger.info('[CreateReservoirTables] reservoir_data table created successfully');

    // Create indexes for better query performance
    logger.info('[CreateReservoirTables] Creating indexes');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservoir_locations_province ON reservoir_locations(province);
      CREATE INDEX IF NOT EXISTS idx_reservoir_locations_amphure ON reservoir_locations(amphure);
      CREATE INDEX IF NOT EXISTS idx_reservoir_locations_data_source ON reservoir_locations(data_source);
      CREATE INDEX IF NOT EXISTS idx_reservoir_data_reservoir_id ON reservoir_data(reservoir_id);
      CREATE INDEX IF NOT EXISTS idx_reservoir_data_date ON reservoir_data(date);
      CREATE INDEX IF NOT EXISTS idx_reservoir_data_type ON reservoir_data(type);
    `);
    logger.info('[CreateReservoirTables] Indexes created successfully');

    logger.info('[CreateReservoirTables] All reservoir tables created successfully');
  } catch (error) {
    logger.error('[CreateReservoirTables] Error creating reservoir tables', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await client.end();
    logger.info('[CreateReservoirTables] Database connection closed');
  }
}

// Execute the function
createReservoirTables()
  .then(() => {
    logger.info('[CreateReservoirTables] Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[CreateReservoirTables] Migration failed', {
      error: error.message
    });
    process.exit(1);
  }); 