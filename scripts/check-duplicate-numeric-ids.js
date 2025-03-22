/**
 * Script to check for duplicate numeric_station_id values in the telemetry_data_stations table
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

async function checkDuplicateNumericIds() {
  const client = await pool.connect();
  
  try {
    console.log('Checking for duplicate numeric_station_id values...');
    
    // Find duplicate numeric_station_id values
    const { rows: duplicates } = await client.query(`
      SELECT numeric_station_id, COUNT(*) as count, data_source, 
             ARRAY_AGG(station_id) as station_ids
      FROM telemetry_data_stations
      GROUP BY numeric_station_id, data_source
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (duplicates.length === 0) {
      console.log('No duplicates found in numeric_station_id');
    } else {
      console.log(`Found ${duplicates.length} groups of duplicates:`);
      console.table(duplicates);
      
      // Get detailed information about these duplicates
      console.log('\nDetailed information about duplicates:');
      for (const duplicate of duplicates) {
        const { rows: details } = await client.query(`
          SELECT id, station_id, numeric_station_id, station_name, category, data_source 
          FROM telemetry_data_stations
          WHERE numeric_station_id = $1 AND data_source = $2
          ORDER BY id
        `, [duplicate.numeric_station_id, duplicate.data_source]);
        
        console.log(`\nDuplicate group for numeric_station_id = ${duplicate.numeric_station_id}, data_source = ${duplicate.data_source}:`);
        console.table(details);
      }
      
      // Save detailed info to a file
      const outputFile = 'duplicate_numeric_ids.json';
      fs.writeFileSync(outputFile, JSON.stringify(duplicates, null, 2));
      console.log(`\nDuplicates saved to ${outputFile}`);
    }
    
    // Now check if there would be duplicates when merging the station_id and numeric_station_id
    const { rows: potentialDuplicates } = await client.query(`
      WITH potential_data AS (
        SELECT numeric_station_id as new_station_id, data_source
        FROM telemetry_data_stations
      )
      SELECT new_station_id, data_source, COUNT(*) as count
      FROM potential_data
      GROUP BY new_station_id, data_source
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (potentialDuplicates.length === 0) {
      console.log('\nNo potential duplicates found when merging station_id and numeric_station_id');
    } else {
      console.log(`\nFound ${potentialDuplicates.length} potential duplicate groups after merging:`);
      console.table(potentialDuplicates);
      
      // Save potential duplicates to a file
      const potentialFile = 'potential_duplicate_ids.json';
      fs.writeFileSync(potentialFile, JSON.stringify(potentialDuplicates, null, 2));
      console.log(`Potential duplicates saved to ${potentialFile}`);
    }
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
checkDuplicateNumericIds().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 