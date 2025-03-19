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
 * Inserts or updates rainfall data for a telemetry station using DELETE then INSERT
 */
async function insertRainfallData(client, tele_station_id, rainfall_datetime, rainfall1h, rainfall_today, data_source) {
  try {
    // Skip if missing datetime
    if (!rainfall_datetime) {
      logger.warn(`[ThaiWaterDB] Skipping record with missing datetime for station ${tele_station_id}`);
      return { action: 'skipped' };
    }

    // First delete any existing record for this station and datetime
    const deleteQuery = `
      DELETE FROM thaiwater_rainfall_data_new 
      WHERE tele_station_id = $1 AND rainfall_datetime = $2
    `;
    const deleteResult = await client.query(deleteQuery, [tele_station_id, rainfall_datetime]);
    
    // Then insert the new record
    const insertQuery = `
      INSERT INTO thaiwater_rainfall_data_new 
      (tele_station_id, rainfall_datetime, rainfall1h, rainfall_today, data_source, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `;
    await client.query(insertQuery, [tele_station_id, rainfall_datetime, rainfall1h, rainfall_today, data_source]);
    
    // Determine if this was an insert or update based on the delete result
    const action = deleteResult.rowCount > 0 ? 'updated' : 'inserted';
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

        // Parse the data directly from the API
        const rainfall1h = parseFloat(record.rainfall1h) || 0;
        const rainfall_today = parseFloat(record.rainfall_today) || 0;

        // Insert or update the rainfall data
        const result = await insertRainfallData(
          client, 
          record.tele_station_id, 
          record.rainfall_datetime, 
          rainfall1h, 
          rainfall_today, 
          'HII'
        );
        
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