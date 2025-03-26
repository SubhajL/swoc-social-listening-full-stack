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

// Function to check random stations in the database
async function checkRandomStations() {
  console.log('Connecting to database...');
  
  const client = new pg.Client({
    connectionString: databaseUrl
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get 10 random stations that have rainfall data from today
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    // Use a subquery to get distinct stations with recent data
    const stationsQuery = `
      SELECT ts.tele_station_id, ts.tele_station_name, ts.province 
      FROM thaiwater_tele_stations ts
      WHERE ts.tele_station_id IN (
        SELECT DISTINCT rd.tele_station_id
        FROM thaiwater_rainfall_data_new rd
        WHERE rd.rainfall_datetime >= $1
      )
      ORDER BY RANDOM() 
      LIMIT 10
    `;
    
    const stationsResult = await client.query(stationsQuery, [todayDate]);
    
    if (stationsResult.rows.length === 0) {
      console.log('No stations found with recent rainfall data. Checking for any stations with data:');
      
      // Fallback to any stations with rainfall data
      const fallbackQuery = `
        SELECT ts.tele_station_id, ts.tele_station_name, ts.province 
        FROM thaiwater_tele_stations ts
        WHERE ts.tele_station_id IN (
          SELECT DISTINCT rd.tele_station_id
          FROM thaiwater_rainfall_data_new rd
        )
        ORDER BY RANDOM() 
        LIMIT 10
      `;
      
      const fallbackResult = await client.query(fallbackQuery);
      if (fallbackResult.rows.length > 0) {
        for (const station of fallbackResult.rows) {
          await processStation(client, station);
        }
      } else {
        console.log('No stations found with any rainfall data.');
      }
    } else {
      for (const station of stationsResult.rows) {
        await processStation(client, station);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Function to process and display station data
async function processStation(client, station) {
  console.log(`\nStation ${station.tele_station_id}: ${station.tele_station_name} (${station.province})`);
  
  // Get the most recent record for this station
  const rainfallQuery = `
    SELECT 
      rainfall_datetime, 
      rainfall10m, 
      rainfall1h, 
      rainfall24h, 
      rainfall_today
    FROM thaiwater_rainfall_data_new
    WHERE tele_station_id = $1
    ORDER BY rainfall_datetime DESC
    LIMIT 3
  `;
  
  const rainfallResult = await client.query(rainfallQuery, [station.tele_station_id]);
  
  if (rainfallResult.rows.length > 0) {
    rainfallResult.rows.forEach((record, index) => {
      console.log(`  Record #${index + 1}:`);
      console.log(`    Timestamp (DB): ${record.rainfall_datetime}`);
      console.log(`    Local Time: ${new Date(record.rainfall_datetime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
      console.log(`    rainfall10m: ${record.rainfall10m === null ? 'NULL' : record.rainfall10m}`);
      console.log(`    rainfall1h: ${record.rainfall1h === null ? 'NULL' : record.rainfall1h}`);
      console.log(`    rainfall24h: ${record.rainfall24h === null ? 'NULL' : record.rainfall24h}`);
      console.log(`    rainfall_today: ${record.rainfall_today === null ? 'NULL' : record.rainfall_today}`);
    });
  } else {
    console.log('  No rainfall data available');
  }
}

// Run the function
checkRandomStations(); 