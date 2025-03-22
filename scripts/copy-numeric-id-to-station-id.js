/**
 * Script to copy numeric_station_id values into station_id field
 * in the telemetry_data_stations table
 */

const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function copyNumericIdToStationId() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to copy numeric_station_id values to station_id...');
    
    // First, create a backup of the current data
    const currentRecords = await client.query(`
      SELECT id, station_id, station_code, numeric_station_id
      FROM telemetry_data_stations
    `);
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = `station_id_backup_${timestamp}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(currentRecords.rows, null, 2));
    console.log(`Backup of current records saved to ${backupFile}`);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Copy numeric_station_id to station_id
    const updateResult = await client.query(`
      UPDATE telemetry_data_stations
      SET station_id = numeric_station_id
      WHERE numeric_station_id IS NOT NULL
      RETURNING id, station_id
    `);
    
    console.log(`Updated ${updateResult.rows.length} records to use numeric_station_id as station_id`);
    
    // Sample of updated records
    const sampleUpdated = await client.query(`
      SELECT id, station_id, station_code, numeric_station_id
      FROM telemetry_data_stations
      ORDER BY RANDOM()
      LIMIT 10
    `);
    
    console.log('\nSample of updated records:');
    console.table(sampleUpdated.rows);
    
    // Verify the unique constraint is still intact
    const duplicateCheck = await client.query(`
      SELECT station_id, data_source, COUNT(*) 
      FROM telemetry_data_stations 
      GROUP BY station_id, data_source 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.error('Found duplicate station_id and data_source combinations:');
      console.table(duplicateCheck.rows);
      throw new Error('Update would violate unique constraint on station_id and data_source');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('All updates committed successfully.');
    
    // Final state summary
    const categoryStats = await client.query(`
      SELECT 
        category, 
        COUNT(*) as total
      FROM telemetry_data_stations
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('\nFinal category breakdown:');
    console.table(categoryStats.rows);
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error copying numeric_station_id to station_id:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
copyNumericIdToStationId().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 