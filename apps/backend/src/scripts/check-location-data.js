// Script to check location data in the database
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function checkLocationData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Checking location data in the database...');
  console.log('Using connection string:', process.env.DATABASE_URL);

  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Successfully connected to the database');

    // Count total stations
    const totalResult = await client.query(`
      SELECT COUNT(*) FROM thaiwater_tele_stations
    `);
    const totalStations = parseInt(totalResult.rows[0].count);
    console.log(`Total stations: ${totalStations}`);

    // Count stations with location data
    const withLocationResult = await client.query(`
      SELECT COUNT(*) FROM thaiwater_tele_stations
      WHERE province IS NOT NULL AND province != ''
    `);
    const withLocationStations = parseInt(withLocationResult.rows[0].count);
    console.log(`Stations with location data: ${withLocationStations} (${(withLocationStations / totalStations * 100).toFixed(2)}%)`);

    // Count stations without location data
    const withoutLocationResult = await client.query(`
      SELECT COUNT(*) FROM thaiwater_tele_stations
      WHERE province IS NULL OR province = ''
    `);
    const withoutLocationStations = parseInt(withoutLocationResult.rows[0].count);
    console.log(`Stations without location data: ${withoutLocationStations} (${(withoutLocationStations / totalStations * 100).toFixed(2)}%)`);

    // Count stations without location data but with coordinates
    const withoutLocationWithCoordsResult = await client.query(`
      SELECT COUNT(*) FROM thaiwater_tele_stations
      WHERE (province IS NULL OR province = '')
      AND tele_station_lat IS NOT NULL 
      AND tele_station_long IS NOT NULL
      AND tele_station_lat BETWEEN 5.5 AND 20.5
      AND tele_station_long BETWEEN 97.5 AND 105.5
    `);
    const withoutLocationWithCoordsStations = parseInt(withoutLocationWithCoordsResult.rows[0].count);
    console.log(`Stations without location data but with valid coordinates: ${withoutLocationWithCoordsStations}`);

    // Get a sample of stations without location data but with coordinates
    const sampleResult = await client.query(`
      SELECT tele_station_id, tele_station_name, tele_station_lat, tele_station_long
      FROM thaiwater_tele_stations
      WHERE (province IS NULL OR province = '')
      AND tele_station_lat IS NOT NULL 
      AND tele_station_long IS NOT NULL
      AND tele_station_lat BETWEEN 5.5 AND 20.5
      AND tele_station_long BETWEEN 97.5 AND 105.5
      LIMIT 5
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('\nSample stations without location data but with valid coordinates:');
      sampleResult.rows.forEach(row => {
        console.log(`- ID: ${row.tele_station_id}, Name: ${row.tele_station_name || 'N/A'}, Coordinates: ${row.tele_station_lat}, ${row.tele_station_long}`);
      });
    }

    // Release client
    client.release();
  } catch (error) {
    console.error('Error checking location data:', error.message);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the function
checkLocationData().catch(error => {
  console.error('Unhandled error:', error.message);
  process.exit(1);
}); 