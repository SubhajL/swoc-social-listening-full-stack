/**
 * Script to identify records that would cause duplicate violations 
 * when copying numeric_station_id to station_id
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

async function identifyDuplicateIssues() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to identify potential duplicate issues...');
    
    // Identify records with same numeric_station_id and data_source
    const duplicateQuery = `
      WITH potential_duplicates AS (
        SELECT 
          numeric_station_id,
          data_source,
          COUNT(*) as duplicate_count
        FROM telemetry_data_stations
        WHERE numeric_station_id IS NOT NULL
        GROUP BY numeric_station_id, data_source
        HAVING COUNT(*) > 1
      )
      SELECT 
        pd.numeric_station_id,
        pd.data_source,
        pd.duplicate_count,
        t.id,
        t.station_id,
        t.station_code,
        t.station_name,
        t.category
      FROM potential_duplicates pd
      JOIN telemetry_data_stations t 
        ON pd.numeric_station_id = t.numeric_station_id 
        AND pd.data_source = t.data_source
      ORDER BY pd.numeric_station_id, pd.data_source, t.id
    `;
    
    const duplicateResult = await client.query(duplicateQuery);
    
    if (duplicateResult.rows.length > 0) {
      console.log(`Found ${duplicateResult.rows.length} records that would cause duplicates when updating station_id:`);
      console.table(duplicateResult.rows);
      
      // Save the duplicates to a file for reference
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const duplicatesFile = `duplicate_issues_${timestamp}.json`;
      fs.writeFileSync(duplicatesFile, JSON.stringify(duplicateResult.rows, null, 2));
      console.log(`Detailed duplicate records saved to ${duplicatesFile}`);
      
      // Group by numeric_station_id and data_source
      const duplicateSummary = await client.query(`
        SELECT 
          numeric_station_id,
          data_source,
          COUNT(*) as count,
          ARRAY_AGG(station_id) as station_ids,
          ARRAY_AGG(station_code) as station_codes
        FROM telemetry_data_stations
        WHERE numeric_station_id IN (
          SELECT numeric_station_id
          FROM telemetry_data_stations
          WHERE numeric_station_id IS NOT NULL
          GROUP BY numeric_station_id, data_source
          HAVING COUNT(*) > 1
        )
        GROUP BY numeric_station_id, data_source
        ORDER BY count DESC, numeric_station_id
      `);
      
      console.log('\nSummary of duplicate numeric_station_id values:');
      console.table(duplicateSummary.rows);
    } else {
      console.log('No potential duplicate issues found.');
    }
    
    // Check for records where numeric_station_id conflicts with existing station_id
    const conflictQuery = `
      SELECT 
        t1.id as id1,
        t1.station_id as station_id1,
        t1.numeric_station_id as numeric_id1,
        t1.data_source as data_source1,
        t2.id as id2,
        t2.station_id as station_id2,
        t2.numeric_station_id as numeric_id2,
        t2.data_source as data_source2
      FROM telemetry_data_stations t1
      JOIN telemetry_data_stations t2 ON t1.numeric_station_id = t2.station_id
        AND t1.data_source = t2.data_source
        AND t1.id != t2.id
      ORDER BY t1.numeric_station_id
    `;
    
    const conflictResult = await client.query(conflictQuery);
    
    if (conflictResult.rows.length > 0) {
      console.log(`\nFound ${conflictResult.rows.length} conflicts between numeric_station_id and existing station_id values:`);
      console.table(conflictResult.rows);
      
      // Save the conflicts to a file for reference
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const conflictsFile = `station_id_conflicts_${timestamp}.json`;
      fs.writeFileSync(conflictsFile, JSON.stringify(conflictResult.rows, null, 2));
      console.log(`Detailed conflict records saved to ${conflictsFile}`);
    } else {
      console.log('\nNo conflicts found between numeric_station_id and existing station_id values.');
    }
    
  } catch (error) {
    console.error('Error identifying duplicate issues:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
identifyDuplicateIssues().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 