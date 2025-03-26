import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the backend .env file
const envPath = path.join(__dirname, 'apps/backend/.env');

// Check if the file exists
if (fs.existsSync(envPath)) {
  // Load environment variables from the backend .env file
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
}

// Fallback to reading the DATABASE_URL directly if it's not in the environment
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match && match[1]) {
      databaseUrl = match[1].trim();
      console.log(`Read DATABASE_URL from .env file: ${databaseUrl.substring(0, 20)}...`);
    }
  } catch (error) {
    console.error(`Error reading .env file: ${error.message}`);
  }
}

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable not found in backend .env file');
  process.exit(1);
}

async function checkStation384() {
  console.log('Connecting to database...');
  
  const client = new pg.Client({
    connectionString: databaseUrl
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get station info
    const stationQuery = `
      SELECT *
      FROM thaiwater_tele_stations
      WHERE tele_station_id = 384
    `;
    
    const stationResult = await client.query(stationQuery);
    
    if (stationResult.rows.length === 0) {
      console.log('Station 384 not found in the database.');
      return;
    }
    
    const station = stationResult.rows[0];
    console.log('\nStation 384 info:');
    console.log(station);
    
    // Get all rainfall data for station 384
    const rainfallQuery = `
      SELECT 
        rainfall_datetime, 
        rainfall10m, 
        rainfall1h, 
        rainfall24h, 
        rainfall_today,
        data_source,
        created_at,
        updated_at
      FROM thaiwater_rainfall_data_new
      WHERE tele_station_id = 384
      ORDER BY rainfall_datetime DESC
    `;
    
    const rainfallResult = await client.query(rainfallQuery);
    
    console.log(`\nAll rainfall records for station 384 (${rainfallResult.rows.length} records):`);
    
    if (rainfallResult.rows.length > 0) {
      rainfallResult.rows.forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  Timestamp (DB): ${record.rainfall_datetime}`);
        console.log(`  Local Time: ${new Date(record.rainfall_datetime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
        console.log(`  rainfall10m: ${record.rainfall10m === null ? 'NULL' : record.rainfall10m}`);
        console.log(`  rainfall1h: ${record.rainfall1h === null ? 'NULL' : record.rainfall1h}`);
        console.log(`  rainfall24h: ${record.rainfall24h === null ? 'NULL' : record.rainfall24h}`);
        console.log(`  rainfall_today: ${record.rainfall_today === null ? 'NULL' : record.rainfall_today}`);
        console.log(`  data_source: ${record.data_source}`);
        console.log(`  created_at: ${record.created_at}`);
        console.log(`  updated_at: ${record.updated_at}`);
        console.log('-----------------------------------');
      });
      
      // Check specifically for 9:00 AM records
      console.log("\nLooking specifically for 9:00 AM records:");
      const nineAMRecords = rainfallResult.rows.filter(record => {
        const date = new Date(record.rainfall_datetime);
        return date.getHours() === 9;
      });
      
      if (nineAMRecords.length > 0) {
        console.log(`Found ${nineAMRecords.length} records at 9:00 AM:`);
        nineAMRecords.forEach((record, index) => {
          console.log(`9 AM Record ${index + 1}:`);
          console.log(`  Timestamp (DB): ${record.rainfall_datetime}`);
          console.log(`  Local Time: ${new Date(record.rainfall_datetime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
          console.log(`  rainfall10m: ${record.rainfall10m === null ? 'NULL' : record.rainfall10m}`);
          console.log(`  rainfall1h: ${record.rainfall1h === null ? 'NULL' : record.rainfall1h}`);
          console.log(`  rainfall24h: ${record.rainfall24h === null ? 'NULL' : record.rainfall24h}`);
          console.log(`  rainfall_today: ${record.rainfall_today === null ? 'NULL' : record.rainfall_today}`);
          console.log(`  data_source: ${record.data_source}`);
          console.log(`  created_at: ${record.created_at}`);
          console.log(`  updated_at: ${record.updated_at}`);
          console.log('-----------------------------------');
        });
      } else {
        console.log("No 9:00 AM records found.");
      }
    } else {
      console.log('No rainfall data available for station 384.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the function
checkStation384(); 