#!/usr/bin/env node

/**
 * Script to create the telemetry_data table for storing RID telemetry readings
 * 
 * This table will store water level, flow rate, and other telemetry data
 * from RID stations with timestamps.
 */

const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create telemetry_data table
async function createTelemetryDataTable() {
  try {
    console.log('Creating telemetry_data table...');
    
    // Check if table exists first
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'telemetry_data'
      );
    `);
    
    const tableExists = checkTableResult.rows[0].exists;
    
    if (tableExists) {
      console.log('telemetry_data table already exists. Checking structure...');
      
      // Check if all required columns exist
      const requiredColumns = [
        'station_id', 'reading_time', 'reading_time_utc', 'water_level', 
        'water_level_above', 'flow_rate', 'average_flow_rate', 'notation_id', 'source'
      ];
      
      const columnResult = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'telemetry_data';
      `);
      
      const existingColumns = columnResult.rows.map(row => row.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('All required columns already exist in telemetry_data table.');
        return;
      }
      
      console.log(`Missing columns: ${missingColumns.join(', ')}`);
      console.log('Altering table to add missing columns...');

      // Add missing columns
      for (const column of missingColumns) {
        await addColumn(column);
      }
      
      console.log('Table structure updated successfully.');
      return;
    }
    
    // Create table
    const createTableQuery = `
      CREATE TABLE telemetry_data (
        id SERIAL PRIMARY KEY,
        station_id VARCHAR(50) NOT NULL,
        reading_time TIMESTAMP WITH TIME ZONE NOT NULL,
        reading_time_utc TIMESTAMP WITH TIME ZONE,
        water_level NUMERIC,
        water_level_above NUMERIC,
        flow_rate NUMERIC,
        average_flow_rate NUMERIC,
        notation_id INTEGER,
        source VARCHAR(50) NOT NULL DEFAULT 'RID API',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_telemetry_data_station_time UNIQUE (station_id, reading_time)
      );
      
      -- Create indexes for performance
      CREATE INDEX idx_telemetry_data_station_id ON telemetry_data(station_id);
      CREATE INDEX idx_telemetry_data_reading_time ON telemetry_data(reading_time);
      CREATE INDEX idx_telemetry_data_source ON telemetry_data(source);
      
      -- Add comment
      COMMENT ON TABLE telemetry_data IS 'Stores telemetry readings from RID and other sources';
    `;
    
    await pool.query(createTableQuery);
    console.log('telemetry_data table created successfully.');
  } catch (error) {
    console.error('Error creating telemetry_data table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Helper function to add a column if needed
async function addColumn(columnName) {
  try {
    let query;
    
    // Define column type based on name
    switch (columnName) {
      case 'station_id':
        query = 'ALTER TABLE telemetry_data ADD COLUMN station_id VARCHAR(50) NOT NULL;';
        break;
      case 'reading_time':
        query = 'ALTER TABLE telemetry_data ADD COLUMN reading_time TIMESTAMP WITH TIME ZONE NOT NULL;';
        break;
      case 'reading_time_utc':
        query = 'ALTER TABLE telemetry_data ADD COLUMN reading_time_utc TIMESTAMP WITH TIME ZONE;';
        break;
      case 'water_level':
      case 'water_level_above':
      case 'flow_rate':
      case 'average_flow_rate':
        query = `ALTER TABLE telemetry_data ADD COLUMN ${columnName} NUMERIC;`;
        break;
      case 'notation_id':
        query = 'ALTER TABLE telemetry_data ADD COLUMN notation_id INTEGER;';
        break;
      case 'source':
        query = 'ALTER TABLE telemetry_data ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT \'RID API\';';
        break;
      default:
        console.warn(`Unknown column: ${columnName}. Skipping.`);
        return;
    }
    
    await pool.query(query);
    console.log(`Added column: ${columnName}`);
  } catch (error) {
    console.error(`Error adding column ${columnName}:`, error.message);
  }
}

// Run the script
createTelemetryDataTable()
  .then(() => {
    console.log('Script completed successfully.');
  })
  .catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  }); 