#!/usr/bin/env node

/**
 * Script to create the telemetry_data_stations table for storing RID station information
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

// Create telemetry_data_stations table
async function createTelemetryStationsTable() {
  try {
    console.log('Creating telemetry_data_stations table...');
    
    // Check if table exists first
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'telemetry_data_stations'
      );
    `);
    
    const tableExists = checkTableResult.rows[0].exists;
    
    if (tableExists) {
      console.log('telemetry_data_stations table already exists. Checking structure...');
      
      // Check if all required columns exist
      const requiredColumns = [
        'station_id', 'station_name', 'hydro_id', 'data_source', 
        'latitude', 'longitude', 'elevation', 'last_sync'
      ];
      
      const columnResult = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'telemetry_data_stations';
      `);
      
      const existingColumns = columnResult.rows.map(row => row.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('All required columns already exist in telemetry_data_stations table.');
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
      CREATE TABLE telemetry_data_stations (
        id SERIAL PRIMARY KEY,
        station_id VARCHAR(50) NOT NULL UNIQUE,
        station_name VARCHAR(255),
        hydro_id INTEGER,
        data_source VARCHAR(50) NOT NULL DEFAULT 'hourly',
        latitude NUMERIC,
        longitude NUMERIC,
        elevation NUMERIC,
        last_sync TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for performance
      CREATE INDEX idx_telemetry_stations_station_id ON telemetry_data_stations(station_id);
      CREATE INDEX idx_telemetry_stations_hydro_id ON telemetry_data_stations(hydro_id);
      CREATE INDEX idx_telemetry_stations_data_source ON telemetry_data_stations(data_source);
      
      -- Add comment
      COMMENT ON TABLE telemetry_data_stations IS 'Stores information about telemetry stations from RID and other sources';
    `;
    
    await pool.query(createTableQuery);
    console.log('telemetry_data_stations table created successfully.');
    
  } catch (error) {
    console.error('Error creating telemetry_data_stations table:', error);
    throw error;
  }
}

// Helper function to add a column to the table
async function addColumn(columnName) {
  let columnDefinition;
  
  switch (columnName) {
    case 'station_id':
      columnDefinition = 'VARCHAR(50) NOT NULL UNIQUE';
      break;
    case 'station_name':
      columnDefinition = 'VARCHAR(255)';
      break;
    case 'hydro_id':
      columnDefinition = 'INTEGER';
      break;
    case 'data_source':
      columnDefinition = 'VARCHAR(50) NOT NULL DEFAULT \'hourly\'';
      break;
    case 'latitude':
    case 'longitude':
    case 'elevation':
      columnDefinition = 'NUMERIC';
      break;
    case 'last_sync':
      columnDefinition = 'TIMESTAMP WITH TIME ZONE';
      break;
    default:
      throw new Error(`Unknown column: ${columnName}`);
  }
  
  const addColumnQuery = `
    ALTER TABLE telemetry_data_stations 
    ADD COLUMN ${columnName} ${columnDefinition};
  `;
  
  await pool.query(addColumnQuery);
  console.log(`Added column ${columnName} to telemetry_data_stations table.`);
}

// Run the script
createTelemetryStationsTable()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 