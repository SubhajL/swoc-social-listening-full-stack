// Script to verify amphure name cleanup in thaiwater_tele_stations
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyAmphureCleanup() {
  console.log('Verifying amphure name cleanup in thaiwater_tele_stations...');
  
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
    // Check if there are any rows with amphure names starting with 'อำเภอ'
    const prefixQuery = `
      SELECT 
        COUNT(*) as count
      FROM 
        thaiwater_tele_stations
      WHERE 
        amphure LIKE 'อำเภอ%';
    `;
    
    const prefixResult = await pool.query(prefixQuery);
    const prefixCount = parseInt(prefixResult.rows[0].count);
    
    console.log(`Records with 'อำเภอ' prefix: ${prefixCount}`);
    
    // Get some sample data from the table to check current values
    const sampleQuery = `
      SELECT 
        tele_station_id,
        tele_station_name,
        amphure,
        data_source,
        updated_at
      FROM 
        thaiwater_tele_stations
      ORDER BY 
        updated_at DESC
      LIMIT 20;
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('\nRecent records (ordered by updated_at):');
    console.table(sampleResult.rows);
    
    // Get the total count of records
    const countQuery = `
      SELECT COUNT(*) as total_count FROM thaiwater_tele_stations;
    `;
    
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].total_count);
    
    console.log(`\nTotal records in thaiwater_tele_stations: ${totalCount}`);
    
    // Check the database server time to see when the last update was performed
    const timeQuery = `
      SELECT NOW() as current_time;
    `;
    
    const timeResult = await pool.query(timeQuery);
    console.log(`\nDatabase server current time: ${timeResult.rows[0].current_time}`);
    
  } catch (error) {
    console.error(`Error verifying amphure cleanup: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Verification completed');
  }
}

// Run the function
verifyAmphureCleanup().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 