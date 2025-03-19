// Script to verify province names have been cleaned
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Verify province names have been cleaned
 */
async function verifyProvinceNames() {
  console.log('Verifying province names...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check for any remaining records with "จังหวัด" prefix
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations
      WHERE province LIKE 'จังหวัด%';
    `;
    
    const checkResult = await pool.query(checkQuery);
    if (checkResult.rows[0].count > 0) {
      console.log(`Found ${checkResult.rows[0].count} records still with "จังหวัด" prefix`);
    } else {
      console.log('No records found with "จังหวัด" prefix - cleanup was successful');
    }
    
    // Query some specific station IDs that were updated
    const stationIds = [40, 50, 3713, 3719, 43];
    const stationQuery = `
      SELECT 
        tele_station_id,
        tele_station_name,
        province,
        amphure,
        tambon
      FROM 
        thaiwater_tele_stations
      WHERE 
        tele_station_id = ANY($1)
      ORDER BY 
        tele_station_id;
    `;
    
    const stationResult = await pool.query(stationQuery, [stationIds]);
    console.log(`\nVerifying ${stationResult.rowCount} specific stations:`);
    stationResult.rows.forEach(row => {
      console.log(`ID: ${row.tele_station_id}, Name: ${row.tele_station_name}, Province: ${row.province}, Amphure: ${row.amphure}, Tambon: ${row.tambon}`);
    });
    
    // Get a summary of unique provinces
    const provinceQuery = `
      SELECT 
        province, 
        COUNT(*) as station_count
      FROM 
        thaiwater_tele_stations
      GROUP BY 
        province
      ORDER BY 
        station_count DESC, 
        province;
    `;
    
    const provinceResult = await pool.query(provinceQuery);
    console.log(`\nFound ${provinceResult.rowCount} unique provinces:`);
    provinceResult.rows.forEach(row => {
      console.log(`Province: ${row.province}, Station Count: ${row.station_count}`);
    });
    
  } catch (error) {
    console.error(`Error verifying province names: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('\nVerification completed');
  }
}

// Run the function
verifyProvinceNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 