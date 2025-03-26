const { Pool } = require('pg');
const pool = new Pool();

async function checkStation420() {
  try {
    const client = await pool.connect();
    console.log('Connected to database');
    
    // Check station info
    const stationResult = await client.query(
      'SELECT * FROM thaiwater_tele_stations WHERE id = 420'
    );
    
    if (stationResult.rows.length > 0) {
      console.log('Station 420 found:');
      console.log(stationResult.rows[0]);
      
      // Check recent rainfall data
      const rainfallResult = await client.query(
        'SELECT * FROM thaiwater_rainfall_data_new WHERE tele_station_id = 420 ORDER BY recorded_timestamp DESC LIMIT 5'
      );
      
      console.log('\nRecent rainfall data for station 420:');
      console.log(rainfallResult.rows);
    } else {
      console.log('Station 420 not found');
    }
    
    await client.release();
    await pool.end();
  } catch (err) {
    console.error('Error checking station data:', err);
    process.exit(1);
  }
}

checkStation420(); 