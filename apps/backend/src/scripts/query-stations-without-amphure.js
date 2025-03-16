// Script to query stations without Amphure data
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function queryStationsWithoutAmphure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Querying stations without Amphure data...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Query stations without Amphure data
    const query = `
      SELECT 
        tele_station_id as station_id, 
        amphure, 
        province, 
        tele_station_name as station_name, 
        tele_station_lat as lat, 
        tele_station_long as long,
        tele_station_type as station_type,
        agency_id,
        data_source
      FROM 
        thaiwater_tele_stations 
      WHERE 
        amphure IS NULL 
        OR amphure = ''
      ORDER BY 
        province, station_id;
    `;

    const result = await pool.query(query);
    
    console.log(`Found ${result.rowCount} stations without Amphure data`);
    
    // Convert numeric strings to numbers
    const formattedRows = result.rows.map(row => {
      return {
        ...row,
        lat: row.lat !== null ? parseFloat(row.lat) : null,
        long: row.long !== null ? parseFloat(row.long) : null,
        agency_id: row.agency_id !== null ? parseInt(row.agency_id) : null
      };
    });
    
    // Output as JSON
    console.log(JSON.stringify(formattedRows, null, 2));
    
    // Also save to a file for easier viewing
    fs.writeFileSync('stations_without_amphure.json', JSON.stringify(formattedRows, null, 2));
    console.log('\nData also saved to stations_without_amphure.json');
    
  } catch (error) {
    console.error('Error querying stations:', error);
  } finally {
    await pool.end();
  }
}

// Run the query function
queryStationsWithoutAmphure().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 