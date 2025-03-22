#!/usr/bin/env node

/**
 * Check Specific Numeric Station IDs
 * 
 * This script checks the current state of specific numeric_station_id values
 * that were previously identified as duplicates.
 */

const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Set NODE_TLS_REJECT_UNAUTHORIZED to allow self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// The specific numeric IDs to check
const numericIdsToCheck = ['421', '45'];

/**
 * Check specified numeric station IDs
 */
async function checkSpecificNumericIds() {
  try {
    console.log('=== Checking Specific Numeric Station IDs ===');
    
    for (const numericId of numericIdsToCheck) {
      console.log(`\nChecking records with numeric_station_id = ${numericId}:`);
      
      const query = `
        SELECT id, station_id, station_code, station_name, numeric_station_id, 
               show_hourly_report, show_daily_report, status
        FROM telemetry_data_stations
        WHERE numeric_station_id = $1
        ORDER BY id;
      `;
      
      const result = await pool.query(query, [numericId]);
      
      if (result.rows.length === 0) {
        console.log(`No records found with numeric_station_id = ${numericId}`);
        continue;
      }
      
      console.log(`Found ${result.rows.length} records:`);
      
      // Create a table-like output for better readability
      console.log('\n' + '-'.repeat(105));
      console.log('| ID   | Station ID | Station Code | Station Name         | Numeric ID | Hourly | Daily | Status |');
      console.log('|' + '-'.repeat(103) + '|');
      
      result.rows.forEach(record => {
        console.log(
          `| ${record.id.toString().padEnd(5)} | ` +
          `${record.station_id.padEnd(10)} | ` +
          `${record.station_code.padEnd(12)} | ` +
          `${record.station_name.substring(0, 20).padEnd(20)} | ` +
          `${record.numeric_station_id.padEnd(10)} | ` +
          `${record.show_hourly_report ? 'Yes   ' : 'No    '} | ` +
          `${record.show_daily_report ? 'Yes  ' : 'No   '} | ` +
          `${record.status.padEnd(6)} |`
        );
      });
      
      console.log('-'.repeat(105));
    }
  } catch (error) {
    console.error('Error checking specific numeric IDs:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await checkSpecificNumericIds();
  } catch (error) {
    console.error('Error in main function:', error.message);
  } finally {
    // Close the pool
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 