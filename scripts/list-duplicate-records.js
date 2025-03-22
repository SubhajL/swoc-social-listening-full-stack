/**
 * Script to list complete records of stations with duplicate numeric_station_ids
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

async function listDuplicateRecords() {
  const client = await pool.connect();
  
  try {
    console.log('Listing complete records of stations with duplicate numeric_station_ids...');
    
    // Get the numeric_station_ids that have duplicates
    const duplicateIdsQuery = `
      SELECT numeric_station_id, data_source
      FROM telemetry_data_stations
      WHERE numeric_station_id IS NOT NULL
      GROUP BY numeric_station_id, data_source
      HAVING COUNT(*) > 1
    `;
    
    const duplicateIds = await client.query(duplicateIdsQuery);
    
    if (duplicateIds.rows.length === 0) {
      console.log('No duplicate numeric_station_id values found.');
      return;
    }
    
    console.log(`Found ${duplicateIds.rows.length} numeric_station_id values with duplicates.`);
    
    // For each duplicated numeric_station_id, get the complete records
    for (const duplicate of duplicateIds.rows) {
      console.log(`\n=== Complete records for numeric_station_id: ${duplicate.numeric_station_id}, data_source: ${duplicate.data_source} ===`);
      
      const records = await client.query(`
        SELECT *
        FROM telemetry_data_stations
        WHERE numeric_station_id = $1
        AND data_source = $2
        ORDER BY id
      `, [duplicate.numeric_station_id, duplicate.data_source]);
      
      console.log(`Found ${records.rows.length} records:`);
      
      // Print a more readable output of each record
      records.rows.forEach((record, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        for (const [key, value] of Object.entries(record)) {
          console.log(`${key}: ${value}`);
        }
      });
      
      // Also save to a JSON file for easier viewing
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const fileName = `duplicate_records_${duplicate.numeric_station_id}_${timestamp}.json`;
      fs.writeFileSync(fileName, JSON.stringify(records.rows, null, 2));
      console.log(`Records for numeric_station_id ${duplicate.numeric_station_id} saved to ${fileName}`);
    }
    
    // Additionally, get details about the special cases mentioned
    const specificStationIds = ['T.10', 'T.10 ', 'Kgt.34', 'Kgt.34 ', 'X.44', 'X.44  ', 'X.158', 'Gt.1 '];
    
    console.log('\n=== Complete records for specific station_ids of interest ===');
    
    const specificRecords = await client.query(`
      SELECT *
      FROM telemetry_data_stations
      WHERE station_id IN (${specificStationIds.map((_, i) => `$${i+1}`).join(',')})
      OR station_code IN (${specificStationIds.map((_, i) => `$${i+1}`).join(',')})
      ORDER BY numeric_station_id, id
    `, specificStationIds);
    
    console.log(`Found ${specificRecords.rows.length} records for specific station_ids:`);
    
    // Print a more readable output of each record
    specificRecords.rows.forEach((record, index) => {
      console.log(`\n--- Specific Record ${index + 1} ---`);
      console.log(`id: ${record.id}`);
      console.log(`station_id: ${record.station_id}`);
      console.log(`station_code: ${record.station_code}`);
      console.log(`station_name: ${record.station_name}`);
      console.log(`numeric_station_id: ${record.numeric_station_id}`);
      console.log(`data_source: ${record.data_source}`);
      console.log(`category: ${record.category}`);
      console.log(`has_data: ${record.has_data}`);
    });
    
    // Save all specific records to a single file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const specificFileName = `specific_station_records_${timestamp}.json`;
    fs.writeFileSync(specificFileName, JSON.stringify(specificRecords.rows, null, 2));
    console.log(`Specific station records saved to ${specificFileName}`);
    
  } catch (error) {
    console.error('Error listing duplicate records:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
listDuplicateRecords().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 