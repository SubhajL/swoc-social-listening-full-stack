/**
 * Script to query all records from telemetry_data_stations and output in prettified JSON format
 */

const fs = require('fs');
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

async function queryAllDataStations() {
  const client = await pool.connect();
  
  try {
    console.log('Querying all records from telemetry_data_stations...');
    
    const { rows } = await client.query(`
      SELECT * 
      FROM telemetry_data_stations 
      ORDER BY id
    `);
    
    console.log(`Retrieved ${rows.length} records.`);
    
    // Convert any BigInt values to strings to avoid JSON serialization issues
    const processedRows = rows.map(row => {
      const processedRow = {};
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'bigint') {
          processedRow[key] = value.toString();
        } else {
          processedRow[key] = value;
        }
      });
      return processedRow;
    });
    
    // Output to file
    const outputFile = 'all_telemetry_data_stations.json';
    fs.writeFileSync(outputFile, JSON.stringify(processedRows, null, 2));
    console.log(`Output saved to ${outputFile}`);
    
    // Output to console in prettified format (only first 10 if there are many)
    const displayCount = Math.min(10, processedRows.length);
    console.log(`\nShowing first ${displayCount} records:`);
    console.log(JSON.stringify(processedRows.slice(0, displayCount), null, 2));
    
    if (processedRows.length > 10) {
      console.log(`\n... and ${processedRows.length - 10} more records. See ${outputFile} for full data.`);
    }
    
  } catch (error) {
    console.error('Error querying data:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
queryAllDataStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 