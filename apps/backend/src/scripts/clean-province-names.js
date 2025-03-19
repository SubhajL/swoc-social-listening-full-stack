// Script to remove "จังหวัด" prefix from province names in thaiwater_tele_stations table
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Clean province names by removing "จังหวัด" prefix
 */
async function cleanProvinceNames() {
  console.log('Starting province name cleanup...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // First, find all records with "จังหวัด" prefix
    const findQuery = `
      SELECT 
        tele_station_id, 
        province
      FROM 
        thaiwater_tele_stations
      WHERE 
        province LIKE 'จังหวัด%';
    `;
    
    const findResult = await pool.query(findQuery);
    console.log(`Found ${findResult.rowCount} records with "จังหวัด" prefix`);
    
    if (findResult.rowCount > 0) {
      // Log some examples
      console.log('Examples of provinces with prefix:');
      findResult.rows.slice(0, 5).forEach(row => {
        console.log(`ID: ${row.tele_station_id}, Province: ${row.province}`);
      });
      
      // Update the records
      const updateQuery = `
        UPDATE thaiwater_tele_stations
        SET province = SUBSTRING(province, 8)
        WHERE province LIKE 'จังหวัด%'
        RETURNING tele_station_id, province;
      `;
      
      const updateResult = await pool.query(updateQuery);
      console.log(`Updated ${updateResult.rowCount} records`);
      
      // Log some examples of updated records
      console.log('Examples of updated provinces:');
      updateResult.rows.slice(0, 5).forEach(row => {
        console.log(`ID: ${row.tele_station_id}, Province: ${row.province}`);
      });
    } else {
      console.log('No records found with "จังหวัด" prefix');
    }
    
    // Check if there are any remaining records with the prefix
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations
      WHERE province LIKE 'จังหวัด%';
    `;
    
    const checkResult = await pool.query(checkQuery);
    if (checkResult.rows[0].count > 0) {
      console.log(`Warning: ${checkResult.rows[0].count} records still have "จังหวัด" prefix`);
    } else {
      console.log('All "จังหวัด" prefixes have been removed successfully');
    }
    
  } catch (error) {
    console.error(`Error cleaning province names: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Province name cleanup completed');
  }
}

// Run the function
cleanProvinceNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 