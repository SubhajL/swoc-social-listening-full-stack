// ThaiWater rainfall data insertion script
import pg from 'pg';
import dotenv from 'dotenv';
import winston from 'winston';
import axios from 'axios';

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
    new transports.Console(),
    new transports.File({ filename: 'logs/hii-sync.log' })
  ]
});

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98';
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

/**
 * Fetches rainfall data from ThaiWater API
 */
async function getRainfallData() {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=${encodeURIComponent(THAIWATER_API_EID)}`;
    
    logger.info('[ThaiWaterService] Making API request', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('[ThaiWaterService] API response received', {
      totalStations: response.data.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    const errorResponse = error?.response;
    
    logger.error('[ThaiWaterService] API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch rainfall data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Inserts or updates rainfall data for a telemetry station using UPSERT pattern
 */
async function insertRainfallData(client, tele_station_id, rainfall_datetime, rainfall10m, rainfall1h, rainfall3h, rainfall24h, rainfall_today, data_source) {
  try {
    // Skip if missing datetime
    if (!rainfall_datetime) {
      logger.warn(`[ThaiWaterDB] Skipping record with missing datetime for station ${tele_station_id}`);
      return { action: 'skipped' };
    }

    // Ensure the timestamp is correctly parsed - handle both UTC and timezone-aware formats
    let parsedDateTime;
    try {
      // Check if the timestamp has timezone information
      if (rainfall_datetime.includes('+')) {
        // Convert to standardized ISO format
        parsedDateTime = new Date(rainfall_datetime).toISOString();
        logger.debug(`[ThaiWaterDB] Converted timezone-aware timestamp to UTC: ${rainfall_datetime} -> ${parsedDateTime} for station ${tele_station_id}`);
      } else {
        // If no timezone info, assume it's already in UTC
        parsedDateTime = rainfall_datetime;
      }
    } catch (error) {
      logger.error({
        message: '[ThaiWaterDB] Error parsing timestamp',
        station_id: tele_station_id,
        timestamp: rainfall_datetime,
        error: error.message
      });
      parsedDateTime = rainfall_datetime; // Fall back to original value
    }

    // Use upsert pattern with ON CONFLICT for better efficiency
    const result = await client.query(`
      INSERT INTO thaiwater_rainfall_data_new
      (tele_station_id, rainfall_datetime, rainfall10m, rainfall1h, rainfall3h, rainfall24h, rainfall_today, data_source, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (tele_station_id, rainfall_datetime) DO UPDATE SET
        rainfall10m = EXCLUDED.rainfall10m,
        rainfall1h = EXCLUDED.rainfall1h,
        rainfall3h = EXCLUDED.rainfall3h,
        rainfall24h = EXCLUDED.rainfall24h,
        rainfall_today = EXCLUDED.rainfall_today,
        data_source = EXCLUDED.data_source,
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `, [tele_station_id, parsedDateTime, rainfall10m, rainfall1h, rainfall3h, rainfall24h, rainfall_today, data_source]);
    
    // Determine if this was an insert or update based on the returning clause
    const action = result.rows[0]?.inserted ? 'inserted' : 'updated';
    return { action };
  } catch (error) {
    logger.error({
      message: '[ThaiWaterDB] Error upserting rainfall data',
      station_id: tele_station_id,
      datetime: rainfall_datetime,
      error: error.message
    });
    throw error;
  }
}

/**
 * Syncs rainfall data from ThaiWater API to the database
 */
async function syncRainfallData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    logger.info('[ThaiWaterRainfall] Starting rainfall data sync from ThaiWater API');
    
    // Fetch data from ThaiWater API
    const apiResponse = await getRainfallData();
    
    if (!apiResponse.success || !apiResponse.data) {
      throw new Error(`Failed to fetch data from ThaiWater API: ${apiResponse.error}`);
    }
    
    const rainfallData = apiResponse.data;
    logger.info(`[ThaiWaterRainfall] Processing ${rainfallData.length} rainfall records`);
    
    // Track statistics
    const stats = {
      total: rainfallData.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    // Process each rainfall record
    for (const record of rainfallData) {
      try {
        // Skip records with missing tele_station_id or rainfall_datetime
        if (!record.tele_station_id || !record.rainfall_datetime) {
          logger.warn('[ThaiWaterRainfall] Skipping record with missing tele_station_id or rainfall_datetime');
          stats.skipped++;
          continue;
        }

        // Add special logging for station 420
        if (record.tele_station_id == 420) {
          logger.info(`[ThaiWaterRainfall] Processing record for station 420`, {
            rainfall_datetime: record.rainfall_datetime,
            rainfall24h: record.rainfall24h,
            rainfall_today: record.rainfall_today
          });
        }

        // Parse the data directly from the API
        const rainfall10m = record.rainfall10m !== undefined && record.rainfall10m !== null ? parseFloat(record.rainfall10m) : null;
        const rainfall1h = record.rainfall1h !== undefined && record.rainfall1h !== null ? parseFloat(record.rainfall1h) : null;
        const rainfall3h = record.rainfall3h !== undefined && record.rainfall3h !== null ? parseFloat(record.rainfall3h) : null;
        const rainfall24h = record.rainfall24h !== undefined && record.rainfall24h !== null ? parseFloat(record.rainfall24h) : null;
        const rainfall_today = record.rainfall_today !== undefined && record.rainfall_today !== null ? parseFloat(record.rainfall_today) : null;

        // Log the parsed values for station 420
        if (record.tele_station_id == 420) {
          logger.info(`[ThaiWaterRainfall] Parsed values for station 420`, {
            rainfall10m,
            rainfall1h,
            rainfall3h,
            rainfall24h,
            rainfall_today
          });
        }

        // Insert or update the rainfall data
        const result = await insertRainfallData(
          client, 
          record.tele_station_id, 
          record.rainfall_datetime,
          rainfall10m,
          rainfall1h,
          rainfall3h,
          rainfall24h,
          rainfall_today, 
          'HII'
        );
        
        // Log the result specifically for station 420
        if (record.tele_station_id == 420) {
          logger.info(`[ThaiWaterRainfall] Upsert result for station 420: ${result.action}`);
        }
        
        if (result.action === 'inserted') {
          stats.inserted++;
        } else if (result.action === 'updated') {
          stats.updated++;
        } else if (result.action === 'skipped') {
          stats.skipped++;
        }

        stats.processed++;
        
        // Log progress every 100 records
        if (stats.processed % 100 === 0) {
          logger.info(`[ThaiWaterRainfall] Processed ${stats.processed} of ${stats.total} records`);
        }
      } catch (error) {
        logger.error({
          message: '[ThaiWaterRainfall] Error processing rainfall record',
          station_id: record.tele_station_id,
          error: error.message
        });
        stats.errors++;
      }
    }
    
    logger.info('[ThaiWaterRainfall] Rainfall data sync completed successfully', {
      total: stats.total,
      processed: stats.processed,
      inserted: stats.inserted,
      updated: stats.updated,
      skipped: stats.skipped,
      errors: stats.errors
    });
    
    return {
      success: true,
      message: 'Successfully synced rainfall data',
      stats
    };
    
  } catch (error) {
    logger.error('[ThaiWaterRainfall] Error syncing rainfall data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Failed to sync rainfall data',
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Run the sync function
syncRainfallData()
  .then((result) => {
    console.log('ThaiWater rainfall data sync completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.stats) {
      console.log(`Processed: ${result.stats.total}, Inserted: ${result.stats.inserted}, Updated: ${result.stats.updated}, Skipped: ${result.stats.skipped}, Errors: ${result.stats.errors}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running ThaiWater rainfall data sync:', error);
    process.exit(1);
  }); 