// Script to check station 420 rainfall data
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkStation420() {
  console.log('Checking historical records for station 420...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Check station info
    const stationResult = await pool.query('SELECT * FROM thaiwater_tele_stations WHERE tele_station_id = 420');
    console.log('Station 420 info:');
    console.log(stationResult.rows[0]);
    
    // Check latest rainfall data
    const rainfallResult = await pool.query(`
      SELECT * FROM thaiwater_rainfall_data_new 
      WHERE tele_station_id = 420 
      ORDER BY rainfall_datetime DESC 
      LIMIT 5
    `);
    
    console.log('\nLatest rainfall data for station 420:');
    rainfallResult.rows.forEach(row => {
      console.log({
        tele_station_id: row.tele_station_id,
        rainfall_datetime: row.rainfall_datetime,
        rainfall_datetime_local: new Date(row.rainfall_datetime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
        rainfall1h: row.rainfall1h,
        rainfall24h: row.rainfall24h,
        created_at: row.created_at
      });
    });
  } catch (error) {
    console.error('Error checking station 420:', error);
  } finally {
    await pool.end();
    console.log('Check completed');
  }
}

// Run the function
checkStation420().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 