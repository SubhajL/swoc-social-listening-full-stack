// Script to list all stations from the latest update for HII and TMD sources
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkStationsBySource() {
  console.log('Checking stations from latest updates for HII and TMD sources...');
  
  // Get connection string from environment variable
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString ? 'Valid connection string found' : 'undefined - check .env file'}`);
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not found. Make sure the .env file exists and contains DATABASE_URL.');
  }
  
  const pool = new pg.Pool({
    connectionString,
    // Don't use SSL for local connections
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // First, get all unique data sources in the table
    const sourcesQuery = `
      SELECT DISTINCT data_source
      FROM thaiwater_rainfall_data_new
      ORDER BY data_source;
    `;
    
    const sourcesResult = await pool.query(sourcesQuery);
    console.log(`\nData sources found in the table:`);
    if (sourcesResult.rowCount > 0) {
      console.table(sourcesResult.rows);
    }
    
    // Get the latest timestamp for each data source
    const latestTimestampQuery = `
      SELECT 
        data_source,
        MAX(created_at) as latest_timestamp
      FROM thaiwater_rainfall_data_new
      GROUP BY data_source
      ORDER BY data_source;
    `;
    
    const latestTimestampResult = await pool.query(latestTimestampQuery);
    
    console.log(`\nLatest update timestamps by source:`);
    if (latestTimestampResult.rowCount > 0) {
      console.table(latestTimestampResult.rows);
    } else {
      console.log("No data found.");
      return;
    }
    
    // Get the latest rainfall datetime for each data source
    const latestRainfallQuery = `
      SELECT 
        data_source,
        MAX(rainfall_datetime) as latest_rainfall_time
      FROM thaiwater_rainfall_data_new
      GROUP BY data_source
      ORDER BY data_source;
    `;
    
    const latestRainfallResult = await pool.query(latestRainfallQuery);
    
    console.log(`\nLatest rainfall datetimes by source:`);
    if (latestRainfallResult.rowCount > 0) {
      console.table(latestRainfallResult.rows);
    }
    
    // For each source, get the most recent batch of data
    for (const row of latestTimestampResult.rows) {
      const { data_source, latest_timestamp } = row;
      
      // Use a window of time to capture the latest batch of data (last hour)
      const oneHourAgo = new Date(latest_timestamp);
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      console.log(`\n=== Latest data for ${data_source} ===`);
      console.log(`Latest update: ${latest_timestamp}`);
      console.log(`Searching for records created between ${oneHourAgo.toISOString()} and ${latest_timestamp}`);
      
      // Get count of stations in this time window
      const countQuery = `
        SELECT COUNT(*) as station_count
        FROM thaiwater_rainfall_data_new
        WHERE data_source = $1
        AND created_at BETWEEN $2 AND $3;
      `;
      
      const countResult = await pool.query(countQuery, [data_source, oneHourAgo.toISOString(), latest_timestamp]);
      console.log(`Total stations in this time window: ${countResult.rows[0].station_count}`);
      
      if (countResult.rows[0].station_count === 0) {
        console.log("No data found in the last hour. Trying with a larger window (24 hours)...");
        
        // Try with a 24-hour window
        const oneDayAgo = new Date(latest_timestamp);
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        
        const countResult24h = await pool.query(countQuery, [data_source, oneDayAgo.toISOString(), latest_timestamp]);
        console.log(`Total stations in 24-hour window: ${countResult24h.rows[0].station_count}`);
        
        if (countResult24h.rows[0].station_count > 0) {
          // Use the 24-hour window instead
          oneHourAgo.setTime(oneDayAgo.getTime());
          console.log(`Using 24-hour window instead: ${oneDayAgo.toISOString()} to ${latest_timestamp}`);
        }
      }
      
      // Get the most recent rainfall_datetime for this source
      const latestDateQuery = `
        SELECT MAX(rainfall_datetime) as latest_date
        FROM thaiwater_rainfall_data_new
        WHERE data_source = $1;
      `;
      
      const latestDateResult = await pool.query(latestDateQuery, [data_source]);
      const latestDate = latestDateResult.rows[0].latest_date;
      
      if (latestDate) {
        console.log(`Latest rainfall timestamp for ${data_source}: ${latestDate}`);
        
        // Get stations with non-zero rainfall with the latest rainfall_datetime
        const nonZeroQuery = `
          SELECT 
            tele_station_id,
            rainfall_datetime,
            rainfall10m,
            rainfall1h,
            rainfall24h,
            rainfall_today,
            created_at
          FROM thaiwater_rainfall_data_new
          WHERE data_source = $1
          AND rainfall_datetime = $2
          AND (
            CAST(NULLIF(rainfall10m, '') AS DECIMAL) > 0 OR
            CAST(NULLIF(rainfall1h, '') AS DECIMAL) > 0 OR
            CAST(NULLIF(rainfall24h, '') AS DECIMAL) > 0 OR
            CAST(NULLIF(rainfall_today, '') AS DECIMAL) > 0
          )
          ORDER BY CAST(NULLIF(rainfall24h, '') AS DECIMAL) DESC NULLS LAST
          LIMIT 20;
        `;
        
        const nonZeroResult = await pool.query(nonZeroQuery, [data_source, latestDate]);
        
        console.log(`\nStations with non-zero rainfall at ${latestDate} (showing top 20):`);
        if (nonZeroResult.rowCount > 0) {
          console.table(nonZeroResult.rows);
        } else {
          console.log("No stations with non-zero rainfall found at this timestamp.");
        }
        
        // Get distribution of rainfall values
        const distributionQuery = `
          SELECT 
            CASE
              WHEN CAST(NULLIF(rainfall24h, '') AS DECIMAL) IS NULL THEN 'No data'
              WHEN CAST(NULLIF(rainfall24h, '') AS DECIMAL) = 0 THEN '0 mm'
              WHEN CAST(NULLIF(rainfall24h, '') AS DECIMAL) > 0 AND CAST(NULLIF(rainfall24h, '') AS DECIMAL) <= 10 THEN '0.1-10 mm'
              WHEN CAST(NULLIF(rainfall24h, '') AS DECIMAL) > 10 AND CAST(NULLIF(rainfall24h, '') AS DECIMAL) <= 35 THEN '10.1-35 mm'
              WHEN CAST(NULLIF(rainfall24h, '') AS DECIMAL) > 35 AND CAST(NULLIF(rainfall24h, '') AS DECIMAL) <= 90 THEN '35.1-90 mm'
              ELSE '> 90 mm'
            END as rainfall_range,
            COUNT(*) as station_count
          FROM thaiwater_rainfall_data_new
          WHERE data_source = $1
          AND rainfall_datetime = $2
          GROUP BY rainfall_range
          ORDER BY rainfall_range;
        `;
        
        const distributionResult = await pool.query(distributionQuery, [data_source, latestDate]);
        
        console.log(`\nDistribution of rainfall24h values at ${latestDate}:`);
        if (distributionResult.rowCount > 0) {
          console.table(distributionResult.rows);
        } else {
          console.log("No rainfall distribution data available.");
        }
        
        // Get sample of stations with the latest rainfall_datetime
        const sampleQuery = `
          SELECT 
            tele_station_id,
            rainfall_datetime,
            rainfall10m,
            rainfall1h,
            rainfall24h,
            rainfall_today,
            created_at
          FROM thaiwater_rainfall_data_new
          WHERE data_source = $1
          AND rainfall_datetime = $2
          ORDER BY random()
          LIMIT 10;
        `;
        
        const sampleResult = await pool.query(sampleQuery, [data_source, latestDate]);
        
        console.log(`\nRandom sample of 10 stations at ${latestDate}:`);
        if (sampleResult.rowCount > 0) {
          console.table(sampleResult.rows);
        } else {
          console.log("No station data available for sampling.");
        }
      } else {
        console.log(`No rainfall timestamp data available for ${data_source}.`);
      }
    }
    
  } catch (error) {
    console.error(`Error checking stations by source: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('\nCheck completed');
  }
}

// Run the function
checkStationsBySource().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 