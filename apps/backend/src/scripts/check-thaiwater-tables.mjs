// Script to check if ThaiWater tables exist in the database
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

/**
 * Checks if ThaiWater tables exist in the database
 */
async function checkThaiWaterTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('Checking if ThaiWater tables exist in the database...');
    
    // Query to check if tables exist
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('thaiwater_tele_stations', 'thaiwater_rainfall_data')
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No ThaiWater tables found in the database.');
      return false;
    }
    
    console.log('Found the following ThaiWater tables:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check if both tables exist
    const hasStationsTable = result.rows.some(row => row.table_name === 'thaiwater_tele_stations');
    const hasRainfallTable = result.rows.some(row => row.table_name === 'thaiwater_rainfall_data');
    
    if (hasStationsTable && hasRainfallTable) {
      console.log('Both ThaiWater tables exist in the database.');
      
      // Check if tables have data
      const stationsCount = await pool.query('SELECT COUNT(*) FROM thaiwater_tele_stations');
      const rainfallCount = await pool.query('SELECT COUNT(*) FROM thaiwater_rainfall_data');
      
      console.log(`thaiwater_tele_stations has ${stationsCount.rows[0].count} records`);
      console.log(`thaiwater_rainfall_data has ${rainfallCount.rows[0].count} records`);
      
      return true;
    } else {
      console.log('Some ThaiWater tables are missing:');
      if (!hasStationsTable) console.log('- thaiwater_tele_stations is missing');
      if (!hasRainfallTable) console.log('- thaiwater_rainfall_data is missing');
      return false;
    }
    
  } catch (error) {
    console.error('Error checking ThaiWater tables:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the check function
checkThaiWaterTables()
  .then(tablesExist => {
    if (tablesExist) {
      console.log('ThaiWater tables check completed successfully.');
    } else {
      console.log('You need to run the create-thaiwater-tables.mjs script to create the missing tables.');
      console.log('Command: node src/scripts/create-thaiwater-tables.mjs');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 