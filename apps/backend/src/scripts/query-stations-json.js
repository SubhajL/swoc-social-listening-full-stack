// Script to query stations and display them in JSON format
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function queryStationsJson() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Querying stations...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Query stations
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
      ORDER BY 
        province, amphure, station_id
      LIMIT 100;
    `;

    const result = await pool.query(query);
    
    console.log(`Found ${result.rowCount} stations`);
    
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
    fs.writeFileSync('station_data.json', JSON.stringify(formattedRows, null, 2));
    console.log('\nData also saved to station_data.json');
    
  } catch (error) {
    console.error('Error querying stations:', error);
  } finally {
    await pool.end();
  }
}

// Run the query function
queryStationsJson().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 