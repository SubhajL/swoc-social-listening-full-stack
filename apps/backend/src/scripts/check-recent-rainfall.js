// Script to check recent rainfall data (20:00 and 21:00) in the database
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkRecentRainfallData() {
  console.log('Checking for recent rainfall data (20:00 and 21:00)...');
  
  // Get connection string from environment variable
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString || 'undefined - check .env file'}`);
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not found. Make sure the .env file exists and contains DATABASE_URL.');
  }
  
  const pool = new pg.Pool({
    connectionString,
    // Don't use SSL for local connections
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Get server time first
    const timeQuery = `SELECT NOW() as server_time;`;
    const timeResult = await pool.query(timeQuery);
    const serverTime = timeResult.rows[0].server_time;
    
    console.log(`Database server time: ${serverTime}`);
    
    // Calculate the UTC timestamps for 20:00 and 21:00 local time today
    const date = new Date(serverTime);
    date.setHours(0, 0, 0, 0); // Start of day
    
    const timestamp20 = new Date(date);
    timestamp20.setHours(13, 0, 0, 0); // 20:00 local time (13:00 UTC)
    
    const timestamp21 = new Date(date);
    timestamp21.setHours(14, 0, 0, 0); // 21:00 local time (14:00 UTC)
    
    console.log(`Looking for records from 20:00 local (${timestamp20.toISOString()})`);
    console.log(`Looking for records from 21:00 local (${timestamp21.toISOString()})`);
    
    // Find records with timestamp 20:00 local
    const query20 = `
      SELECT 
        tele_station_id, 
        rainfall_datetime, 
        rainfall24h,
        rainfall_today,
        data_source,
        created_at,
        updated_at
      FROM thaiwater_rainfall_data_new
      WHERE rainfall_datetime = $1
      ORDER BY tele_station_id
      LIMIT 50;
    `;
    
    const result20 = await pool.query(query20, [timestamp20.toISOString()]);
    
    console.log(`\nFound ${result20.rowCount} records for 20:00 local time:`);
    if (result20.rowCount > 0) {
      console.table(result20.rows);
    }
    
    // Find records with timestamp 21:00 local
    const query21 = `
      SELECT 
        tele_station_id, 
        rainfall_datetime, 
        rainfall24h,
        rainfall_today,
        data_source,
        created_at,
        updated_at
      FROM thaiwater_rainfall_data_new
      WHERE rainfall_datetime = $1
      ORDER BY tele_station_id
      LIMIT 50;
    `;
    
    const result21 = await pool.query(query21, [timestamp21.toISOString()]);
    
    console.log(`\nFound ${result21.rowCount} records for 21:00 local time:`);
    if (result21.rowCount > 0) {
      console.table(result21.rows);
    }
    
    // Find the most recent records from today
    const queryToday = `
      SELECT 
        rainfall_datetime,
        COUNT(*) as count
      FROM thaiwater_rainfall_data_new
      WHERE DATE(rainfall_datetime) = DATE($1)
      GROUP BY rainfall_datetime
      ORDER BY rainfall_datetime DESC
      LIMIT 10;
    `;
    
    const resultToday = await pool.query(queryToday, [serverTime]);
    
    console.log(`\nMost recent timestamps from today (${new Date(serverTime).toISOString().split('T')[0]}):`);
    if (resultToday.rowCount > 0) {
      console.table(resultToday.rows);
    }
    
    // Check for recently created records
    const queryRecent = `
      SELECT 
        tele_station_id,
        rainfall_datetime,
        data_source,
        created_at
      FROM thaiwater_rainfall_data_new
      WHERE created_at > NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    
    const resultRecent = await pool.query(queryRecent);
    
    console.log(`\nRecords created in the last 30 minutes:`);
    if (resultRecent.rowCount > 0) {
      console.table(resultRecent.rows);
    } else {
      console.log("No records created in the last 30 minutes.");
    }
    
  } catch (error) {
    console.error(`Error checking rainfall data: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Check completed');
  }
}

// Run the function
checkRecentRainfallData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 