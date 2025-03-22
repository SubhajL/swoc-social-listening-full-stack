/**
 * Script to retrieve specific station records from the telemetry_station table
 */

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

async function getSpecificStations() {
  const client = await pool.connect();
  
  try {
    // List of specific station_ids to look up
    const stationIds = [
      'X.158', 'Kgt.34', 'Gt.1',
      '690151', 'C.30', '040361',
      'B.3A', 'T.10',
      'X.269', 'X.44',
      'N.67', '260311',
      'C.13', '040361',
      'S.28', '190620'
    ];
    
    // Also search for station_ids with parentheses
    const parenthesesPatterns = [
      '690151 (C.30)', '040361 (C.30)',
      '260311 (N.67)',
      '040361 (C.13)',
      '190620 (S.28)'
    ];
    
    // Query for exact matches
    const exactResult = await client.query(`
      SELECT *
      FROM telemetry_station
      WHERE station_id IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
      ORDER BY station_id
    `, stationIds);
    
    console.log('Exact matches by station_id:');
    console.table(exactResult.rows);
    
    // Query using LIKE for parentheses patterns
    const likeQueries = parenthesesPatterns.map((pattern, i) => {
      return `station_id LIKE $${i+1}`;
    }).join(' OR ');
    
    const likeResult = await client.query(`
      SELECT *
      FROM telemetry_station
      WHERE ${likeQueries}
      ORDER BY station_id
    `, parenthesesPatterns);
    
    console.log('\nMatches with parentheses patterns:');
    console.table(likeResult.rows);
    
    // Also search for partial matches (e.g. '040361' might be part of '040361 (C.13)')
    const partialMatchResult = await client.query(`
      SELECT *
      FROM telemetry_station
      WHERE ${stationIds.map((_, i) => `station_id LIKE '%' || $${i+1} || '%'`).join(' OR ')}
      ORDER BY station_id
    `, stationIds);
    
    console.log('\nPartial matches by station_id:');
    console.table(partialMatchResult.rows);
    
    // Check code field as well for these IDs
    const codeResult = await client.query(`
      SELECT *
      FROM telemetry_station
      WHERE code IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
      ORDER BY code
    `, stationIds);
    
    console.log('\nMatches by code field:');
    console.table(codeResult.rows);
    
  } catch (error) {
    console.error('Error retrieving specific stations:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
getSpecificStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 