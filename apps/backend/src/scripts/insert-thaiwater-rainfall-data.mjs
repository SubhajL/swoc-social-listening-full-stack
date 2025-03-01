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
    new transports.Console()
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
 * Inserts or updates rainfall data for a telemetry station
 */
async function insertRainfallData(client, stationId, rainfallData) {
  const {
    rainfall10m,
    rainfall1h,
    rainfall24h,
    rainfall_datetime
  } = rainfallData;
  
  // Skip if no datetime
  if (!rainfall_datetime) {
    logger.warn('[ThaiWaterDB] Skipping rainfall data with missing datetime', {
      station_id: stationId
    });
    return;
  }
  
  // Check if data for this timestamp already exists
  const existingData = await client.query(
    'SELECT id FROM thaiwater_rainfall_data WHERE tele_station_id = $1 AND rainfall_datetime = $2',
    [stationId, rainfall_datetime]
  );
  
  if (existingData.rows.length === 0) {
    // Insert new data
    await client.query(`
      INSERT INTO thaiwater_rainfall_data (
        tele_station_id,
        rainfall10m,
        rainfall1h,
        rainfall24h,
        rainfall_datetime,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [
      stationId,
      rainfall10m,
      rainfall1h,
      rainfall24h,
      rainfall_datetime
    ]);
    
    return { action: 'insert' };
  } else {
    // Update existing data
    await client.query(`
      UPDATE thaiwater_rainfall_data SET
        rainfall10m = $2,
        rainfall1h = $3,
        rainfall24h = $4,
        updated_at = NOW()
      WHERE tele_station_id = $1 AND rainfall_datetime = $5
    `, [
      stationId,
      rainfall10m,
      rainfall1h,
      rainfall24h,
      rainfall_datetime
    ]);
    
    return { action: 'update' };
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
    // Begin transaction
    await client.query('BEGIN');
    
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
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    // Process each rainfall record
    for (const record of rainfallData) {
      try {
        // Skip records without valid station ID
        if (!record.tele_station_id) {
          logger.warn('[ThaiWaterRainfall] Skipping record with missing station ID');
          stats.skipped++;
          continue;
        }
        
        // Skip records without valid datetime
        if (!record.rainfall_datetime) {
          logger.warn('[ThaiWaterRainfall] Skipping record with missing datetime', {
            station_id: record.tele_station_id
          });
          stats.skipped++;
          continue;
        }
        
        // Format the rainfall data
        const formattedData = {
          rainfall10m: record.rainfall10m || 0,
          rainfall1h: record.rainfall1h || 0,
          rainfall24h: record.rainfall24h || 0,
          rainfall_datetime: record.rainfall_datetime
        };
        
        // Insert or update the rainfall data
        const result = await insertRainfallData(client, record.tele_station_id, formattedData);
        
        if (result.action === 'insert') {
          stats.inserted++;
        } else if (result.action === 'update') {
          stats.updated++;
        }
        
        // Log progress every 100 records
        if ((stats.inserted + stats.updated + stats.skipped + stats.errors) % 100 === 0) {
          logger.info(`[ThaiWaterRainfall] Progress: ${stats.inserted + stats.updated + stats.skipped + stats.errors}/${stats.total}`);
        }
      } catch (error) {
        logger.error('[ThaiWaterRainfall] Error processing rainfall record', {
          station_id: record.tele_station_id,
          error: error instanceof Error ? error.message : String(error)
        });
        stats.errors++;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('[ThaiWaterRainfall] Rainfall data sync completed successfully', {
      total: stats.total,
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
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
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