// Script to check the status of thaiwater_rainfall_data_new table
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkRainfallData() {
  console.log('Checking thaiwater_rainfall_data_new table...');
  
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
    // Check if the table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'thaiwater_rainfall_data_new'
      ) as exists;
    `;
    
    const tableExistsResult = await pool.query(tableExistsQuery);
    const tableExists = tableExistsResult.rows[0].exists;
    
    console.log(`Table thaiwater_rainfall_data_new exists: ${tableExists}`);
    
    if (!tableExists) {
      console.log('Table does not exist. Exiting...');
      return;
    }
    
    // Get total count of records
    const countQuery = `SELECT COUNT(*) as count FROM thaiwater_rainfall_data_new;`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    
    console.log(`Total records in thaiwater_rainfall_data_new: ${totalCount}`);
    
    // Get latest data timestamp
    const latestTimestampQuery = `
      SELECT MAX(rainfall_datetime) as latest_timestamp 
      FROM thaiwater_rainfall_data_new;
    `;
    
    const latestTimestampResult = await pool.query(latestTimestampQuery);
    const latestTimestamp = latestTimestampResult.rows[0].latest_timestamp;
    
    console.log(`Latest timestamp in thaiwater_rainfall_data_new: ${latestTimestamp}`);
    
    // Get latest records
    const latestRecordsQuery = `
      SELECT 
        tele_station_id, 
        rainfall_datetime, 
        rainfall24h,
        rainfall_today,
        data_source,
        created_at,
        updated_at
      FROM thaiwater_rainfall_data_new
      ORDER BY rainfall_datetime DESC, updated_at DESC
      LIMIT 10;
    `;
    
    const latestRecordsResult = await pool.query(latestRecordsQuery);
    
    console.log('\nLatest 10 records:');
    console.table(latestRecordsResult.rows);
    
    // Get station 420 data (แม่ตื่น อ.แม่แตง จ.เชียงใหม่)
    const station420Query = `
      SELECT 
        tele_station_id, 
        rainfall_datetime, 
        rainfall24h,
        rainfall_today,
        data_source,
        created_at,
        updated_at
      FROM thaiwater_rainfall_data_new
      WHERE tele_station_id = 420
      ORDER BY rainfall_datetime DESC, updated_at DESC
      LIMIT 5;
    `;
    
    const station420Result = await pool.query(station420Query);
    
    console.log('\nStation 420 (แม่ตื่น อ.แม่แตง จ.เชียงใหม่) latest data:');
    console.table(station420Result.rows);
    
    // Get data sources distribution
    const dataSourcesQuery = `
      SELECT 
        data_source, 
        COUNT(*) as count
      FROM thaiwater_rainfall_data_new
      GROUP BY data_source
      ORDER BY count DESC;
    `;
    
    const dataSourcesResult = await pool.query(dataSourcesQuery);
    
    console.log('\nData sources distribution:');
    console.table(dataSourcesResult.rows);
    
    // Check server time
    const serverTimeQuery = `SELECT NOW() as server_time;`;
    const serverTimeResult = await pool.query(serverTimeQuery);
    
    console.log(`\nDatabase server time: ${serverTimeResult.rows[0].server_time}`);
    
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
checkRainfallData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 