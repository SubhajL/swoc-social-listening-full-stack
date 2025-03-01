// Script to check TMD data in the database
import pg from 'pg';
import dotenv from 'dotenv';
import winston from 'winston';

const { Pool } = pg;
const { createLogger, format, transports } = winston;

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

/**
 * Checks TMD data in the database
 */
async function checkTMDData(pool) {
  const client = await pool.connect();
  
  try {
    // Check stations
    const stationsQuery = `
      SELECT data_source, COUNT(*) as count
      FROM thaiwater_tele_stations
      GROUP BY data_source
    `;
    
    const stationsResult = await client.query(stationsQuery);
    
    logger.info('[TMDCheck] Station counts by data source:', {
      stations: stationsResult.rows
    });
    
    // Check TMD stations specifically
    const tmdStationsQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations
      WHERE data_source = 'TMD'
    `;
    
    const tmdStationsResult = await client.query(tmdStationsQuery);
    
    logger.info('[TMDCheck] TMD stations count:', {
      count: parseInt(tmdStationsResult.rows[0].count)
    });
    
    // Check rainfall data
    const rainfallQuery = `
      SELECT data_source, COUNT(*) as count
      FROM thaiwater_rainfall_data
      GROUP BY data_source
    `;
    
    const rainfallResult = await client.query(rainfallQuery);
    
    logger.info('[TMDCheck] Rainfall data counts by data source:', {
      rainfall: rainfallResult.rows
    });
    
    // Check TMD rainfall data specifically
    const tmdRainfallQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_rainfall_data
      WHERE data_source = 'TMD'
    `;
    
    const tmdRainfallResult = await client.query(tmdRainfallQuery);
    
    logger.info('[TMDCheck] TMD rainfall data count:', {
      count: parseInt(tmdRainfallResult.rows[0].count)
    });
    
    // Check latest TMD rainfall data
    const latestRainfallQuery = `
      SELECT 
        r.tele_station_id,
        s.tele_station_name,
        r.rainfall_datetime,
        r.rainfall24h,
        r.rainfall3h
      FROM thaiwater_rainfall_data r
      JOIN thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE r.data_source = 'TMD'
      ORDER BY r.rainfall_datetime DESC
      LIMIT 5
    `;
    
    const latestRainfallResult = await client.query(latestRainfallQuery);
    
    logger.info('[TMDCheck] Latest TMD rainfall data:', {
      latest: latestRainfallResult.rows
    });
    
    // Check highest TMD rainfall
    const highestRainfallQuery = `
      SELECT 
        r.tele_station_id,
        s.tele_station_name,
        r.rainfall_datetime,
        r.rainfall24h,
        r.rainfall3h
      FROM thaiwater_rainfall_data r
      JOIN thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE r.data_source = 'TMD'
      ORDER BY r.rainfall24h DESC
      LIMIT 5
    `;
    
    const highestRainfallResult = await client.query(highestRainfallQuery);
    
    logger.info('[TMDCheck] Highest TMD rainfall:', {
      highest: highestRainfallResult.rows
    });
    
    return {
      success: true,
      message: 'Successfully checked TMD data'
    };
    
  } catch (error) {
    logger.error('[TMDCheck] Error checking data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Failed to check TMD data',
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    client.release();
  }
}

/**
 * Main function to run the TMD data check
 */
async function runTMDCheck() {
  logger.info('[TMDCheck] Starting TMD data check', {
    timestamp: new Date().toISOString()
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await checkTMDData(pool);
    
    if (result.success) {
      logger.info('[TMDCheck] TMD data check completed successfully', {
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('[TMDCheck] TMD data check failed', {
        error: result.error,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('[TMDCheck] Error running TMD data check', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  } finally {
    await pool.end();
  }
}

// Run the check
runTMDCheck()
  .then(() => {
    console.log('TMD data check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running TMD data check:', error);
    process.exit(1);
  }); 