// Script to query a sample of TMD stations
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function queryTMDStationsSample() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Querying a sample of TMD stations...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Query a sample of TMD stations
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
        data_source = 'TMD'
      ORDER BY 
        tele_station_id
      LIMIT 20;
    `;

    const result = await pool.query(query);
    
    console.log(`Found ${result.rowCount} TMD stations`);
    
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
    
  } catch (error) {
    console.error('Error querying stations:', error);
  } finally {
    await pool.end();
  }
}

// Run the query function
queryTMDStationsSample().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 