// Script to check access to ThaiWater tables
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Checks access to ThaiWater tables
 */
async function checkThaiWaterAccess() {
  console.log('Checking access to ThaiWater tables...');
  
  // Check if DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not defined');
    process.exit(1);
  }
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      console.log('Getting current database user...');
      const currentUserResult = await client.query('SELECT current_user');
      const currentUser = currentUserResult.rows[0].current_user;
      console.log(`Current database user: ${currentUser}`);
      
      // Check if we can access thaiwater_tele_stations
      console.log('Checking access to thaiwater_tele_stations...');
      try {
        const stationsResult = await client.query('SELECT COUNT(*) FROM public.thaiwater_tele_stations');
        console.log(`Access to thaiwater_tele_stations: SUCCESS`);
        console.log(`Number of stations: ${stationsResult.rows[0].count}`);
      } catch (error) {
        console.error('Access to thaiwater_tele_stations: FAILED');
        console.error(error.message);
      }
      
      // Check if we can access thaiwater_rainfall_data
      console.log('Checking access to thaiwater_rainfall_data...');
      try {
        const rainfallResult = await client.query('SELECT COUNT(*) FROM public.thaiwater_rainfall_data');
        console.log(`Access to thaiwater_rainfall_data: SUCCESS`);
        console.log(`Number of rainfall records: ${rainfallResult.rows[0].count}`);
      } catch (error) {
        console.error('Access to thaiwater_rainfall_data: FAILED');
        console.error(error.message);
      }
      
      // Check if we can query data_source from thaiwater_tele_stations
      console.log('Checking access to data_source column in thaiwater_tele_stations...');
      try {
        const dataSourceResult = await client.query(`
          SELECT data_source, COUNT(*) 
          FROM public.thaiwater_tele_stations 
          GROUP BY data_source
        `);
        console.log(`Access to data_source column: SUCCESS`);
        console.log('Stations by data source:');
        dataSourceResult.rows.forEach(row => {
          console.log(`  ${row.data_source || 'NULL'}: ${row.count}`);
        });
      } catch (error) {
        console.error('Access to data_source column: FAILED');
        console.error(error.message);
      }
      
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the function if this file is executed directly
checkThaiWaterAccess()
  .then(() => {
    console.log('Access check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error checking access:', error);
    process.exit(1);
  }); 