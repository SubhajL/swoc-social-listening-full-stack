/**
 * Script to check if telemetry_station table exists and list its structure
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

async function checkTelemetryStation() {
  const client = await pool.connect();
  
  try {
    console.log('Checking if telemetry_station table exists...');
    
    // Check if table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'telemetry_station'
      ) as exists
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    console.log(`Table telemetry_station exists: ${tableExists}`);
    
    if (tableExists) {
      // Get column information
      console.log('\nColumns in telemetry_station table:');
      const columnResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'telemetry_station'
        ORDER BY ordinal_position
      `);
      
      console.table(columnResult.rows);
      
      // Get constraint information
      console.log('\nConstraints on telemetry_station table:');
      const constraintResult = await client.query(`
        SELECT con.conname as constraint_name, 
               con.contype as constraint_type,
               pg_get_constraintdef(con.oid) as constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'telemetry_station'
      `);
      
      console.table(constraintResult.rows);
      
      // Get index information
      console.log('\nIndexes on telemetry_station table:');
      const indexResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'telemetry_station'
      `);
      
      console.table(indexResult.rows);
      
      // Get a sample of the data
      console.log('\nSample data from telemetry_station (first 5 rows):');
      const sampleResult = await client.query(`
        SELECT * FROM telemetry_station LIMIT 5
      `);
      
      console.table(sampleResult.rows);
      
      // Count records
      const countResult = await client.query(`
        SELECT COUNT(*) FROM telemetry_station
      `);
      
      console.log(`\nTotal records in telemetry_station: ${countResult.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('Error checking telemetry_station table:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
checkTelemetryStation().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 