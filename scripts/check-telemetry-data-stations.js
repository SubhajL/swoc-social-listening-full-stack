/**
 * Script to check the structure of telemetry_data_stations table
 */

const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTelemetryDataStations() {
  const client = await pool.connect();
  
  try {
    console.log('Checking telemetry_data_stations table structure...');
    
    // Get column information
    console.log('\nColumns in telemetry_data_stations table:');
    const columnResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'telemetry_data_stations'
      ORDER BY ordinal_position
    `);
    
    console.table(columnResult.rows);
    
    // Get constraint information
    console.log('\nConstraints on telemetry_data_stations table:');
    const constraintResult = await client.query(`
      SELECT con.conname as constraint_name, 
             con.contype as constraint_type,
             pg_get_constraintdef(con.oid) as constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'telemetry_data_stations'
    `);
    
    console.table(constraintResult.rows);
    
    // Get index information
    console.log('\nIndexes on telemetry_data_stations table:');
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'telemetry_data_stations'
    `);
    
    console.table(indexResult.rows);
    
    // Count records
    const countResult = await client.query(`
      SELECT COUNT(*) FROM telemetry_data_stations
    `);
    
    console.log(`\nTotal records in telemetry_data_stations: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking telemetry_data_stations table:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
checkTelemetryDataStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 