// Improved ThaiWater rainfall data sync script with batch processing
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configuration
const BATCH_SIZE = 50; // Process records in batches of 50
const LOG_DIRECTORY = path.resolve(process.cwd(), '../../logs');
const PROBLEMATIC_STATIONS_FILE = path.resolve(LOG_DIRECTORY, 'problematic_stations.json');

// API configuration for HII
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98';
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

// Set up logging
function createLogger() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.resolve(LOG_DIRECTORY, `RainfallSync-${timestamp}.log`);
  
  // Make sure log directory exists
  if (!fs.existsSync(LOG_DIRECTORY)) {
    fs.mkdirSync(LOG_DIRECTORY, { recursive: true });
  }
  
  // Create write streams for logs
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  return {
    info: (message, data = {}) => {
      const logEntry = {
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...data
      };
      console.log(`[INFO] ${message}`);
      logStream.write(JSON.stringify(logEntry) + '\n');
    },
    error: (message, data = {}) => {
      const logEntry = {
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        ...data
      };
      console.error(`[ERROR] ${message}`);
      if (data.error) console.error(data.error);
      logStream.write(JSON.stringify(logEntry) + '\n');
    },
    warn: (message, data = {}) => {
      const logEntry = {
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...data
      };
      console.warn(`[WARN] ${message}`);
      logStream.write(JSON.stringify(logEntry) + '\n');
    },
    close: () => {
      logStream.end();
    }
  };
}

const logger = createLogger();

// Problematic stations tracking
let problematicStations = {};

// Load existing problematic stations if available
function loadProblematicStations() {
  try {
    if (fs.existsSync(PROBLEMATIC_STATIONS_FILE)) {
      const content = fs.readFileSync(PROBLEMATIC_STATIONS_FILE, 'utf8');
      problematicStations = JSON.parse(content);
      logger.info(`Loaded ${Object.keys(problematicStations).length} problematic stations from file`);
    }
  } catch (error) {
    logger.error('Error loading problematic stations file', { error: error.message });
    problematicStations = {};
  }
}

// Save problematic stations to file
function saveProblematicStations() {
  try {
    fs.writeFileSync(PROBLEMATIC_STATIONS_FILE, JSON.stringify(problematicStations, null, 2));
    logger.info(`Saved ${Object.keys(problematicStations).length} problematic stations to file`);
  } catch (error) {
    logger.error('Error saving problematic stations file', { error: error.message });
  }
}

// Record a problematic station
function recordProblematicStation(stationId, datetime, error) {
  const key = `${stationId}`;
  
  if (!problematicStations[key]) {
    problematicStations[key] = {
      station_id: stationId,
      error_count: 0,
      errors: []
    };
  }
  
  problematicStations[key].error_count++;
  problematicStations[key].last_error_datetime = datetime;
  problematicStations[key].last_error = error;
  
  if (problematicStations[key].errors.length < 10) {
    problematicStations[key].errors.push({
      datetime,
      error,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Fetches rainfall data from ThaiWater API
 */
async function getRainfallData() {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=${encodeURIComponent(THAIWATER_API_EID)}`;
    
    logger.info('Making API request', { url });

    const response = await axios.get(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('API response received', { totalStations: response.data.length });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    const errorResponse = error?.response;
    
    logger.error('API request failed', {
      error: error.message,
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch rainfall data: ${error.message}`
    };
  }
}

/**
 * Process a batch of rainfall records
 */
async function processBatch(client, records, stats) {
  logger.info(`Processing batch of ${records.length} records`);
  
  for (const record of records) {
    try {
      // Skip records with missing tele_station_id or rainfall_datetime
      if (!record.tele_station_id || !record.rainfall_datetime) {
        logger.warn('Skipping record with missing tele_station_id or rainfall_datetime');
        stats.skipped++;
        continue;
      }

      // Check if this is a known problematic station
      const stationKey = `${record.tele_station_id}`;
      if (problematicStations[stationKey] && problematicStations[stationKey].error_count > 5) {
        logger.warn(`Skipping known problematic station ${record.tele_station_id} (${problematicStations[stationKey].error_count} previous errors)`);
        stats.skipped++;
        continue;
      }

      // Parse the data directly from the API
      const rainfall10m = record.rainfall10m !== undefined && record.rainfall10m !== null ? parseFloat(record.rainfall10m) : null;
      const rainfall1h = record.rainfall1h !== undefined && record.rainfall1h !== null ? parseFloat(record.rainfall1h) : null;
      const rainfall3h = record.rainfall3h !== undefined && record.rainfall3h !== null ? parseFloat(record.rainfall3h) : null;
      const rainfall24h = record.rainfall24h !== undefined && record.rainfall24h !== null ? parseFloat(record.rainfall24h) : null;
      const rainfall_today = record.rainfall_today !== undefined && record.rainfall_today !== null ? parseFloat(record.rainfall_today) : null;

      // Special logging for station 420
      if (record.tele_station_id == 420) {
        logger.info(`Special station 420 data`, {
          rainfall_datetime: record.rainfall_datetime,
          rainfall24h,
          rainfall_today
        });
      }

      // Ensure the timestamp is correctly parsed - handle both UTC and timezone-aware formats
      let parsedDateTime;
      try {
        // Check if the timestamp has timezone information
        if (record.rainfall_datetime.includes('+')) {
          // Convert to standardized ISO format
          parsedDateTime = new Date(record.rainfall_datetime).toISOString();
        } else {
          // If no timezone info, assume it's already in UTC
          parsedDateTime = record.rainfall_datetime;
        }
      } catch (error) {
        logger.error('Error parsing timestamp', {
          station_id: record.tele_station_id,
          timestamp: record.rainfall_datetime,
          error: error.message
        });
        parsedDateTime = record.rainfall_datetime; // Fall back to original value
      }

      // Use individual transaction for this record
      await client.query('BEGIN');

      // Use upsert pattern with ON CONFLICT
      const result = await client.query(`
        INSERT INTO thaiwater_rainfall_data_new
        (tele_station_id, rainfall_datetime, rainfall10m, rainfall1h, rainfall3h, rainfall24h, rainfall_today, data_source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'HII', NOW(), NOW())
        ON CONFLICT (tele_station_id, rainfall_datetime) DO UPDATE SET
          rainfall10m = EXCLUDED.rainfall10m,
          rainfall1h = EXCLUDED.rainfall1h,
          rainfall3h = EXCLUDED.rainfall3h,
          rainfall24h = EXCLUDED.rainfall24h,
          rainfall_today = EXCLUDED.rainfall_today,
          data_source = EXCLUDED.data_source,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        record.tele_station_id,
        parsedDateTime,
        rainfall10m,
        rainfall1h,
        rainfall3h,
        rainfall24h,
        rainfall_today
      ]);

      await client.query('COMMIT');
      
      // Determine if this was an insert or update based on the returning clause
      if (result.rows[0]?.inserted) {
        stats.inserted++;
      } else {
        stats.updated++;
      }

      stats.processed++;
      
    } catch (error) {
      // Rollback the individual transaction if it failed
      await client.query('ROLLBACK');
      
      logger.error('Error processing rainfall record', {
        station_id: record.tele_station_id,
        datetime: record.rainfall_datetime,
        error: error.message
      });
      
      // Record this as a problematic station
      recordProblematicStation(
        record.tele_station_id,
        record.rainfall_datetime,
        error.message
      );
      
      stats.errors++;
    }
  }
  
  return stats;
}

/**
 * Main function to sync rainfall data
 */
async function syncRainfallData() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  const client = await pool.connect();
  const startTime = new Date();
  
  try {
    logger.info('Starting improved rainfall data sync from ThaiWater API');

    // Load list of known problematic stations
    loadProblematicStations();
    
    // First verify the database connection
    logger.info('Testing database connection...');
    const testResult = await client.query('SELECT NOW() as time');
    logger.info('Database connection successful', { serverTime: testResult.rows[0].time });
    
    // Fetch data from ThaiWater API
    const apiResponse = await getRainfallData();
    
    if (!apiResponse.success || !apiResponse.data) {
      throw new Error(`Failed to fetch data from ThaiWater API: ${apiResponse.error}`);
    }
    
    const rainfallData = apiResponse.data;
    logger.info(`Processing ${rainfallData.length} rainfall records`);
    
    // Track statistics
    const stats = {
      total: rainfallData.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      batches: 0
    };
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < rainfallData.length; i += BATCH_SIZE) {
      batches.push(rainfallData.slice(i, i + BATCH_SIZE));
    }
    
    logger.info(`Split data into ${batches.length} batches of max ${BATCH_SIZE} records each`);
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i+1}/${batches.length} (${batch.length} records)`);
      
      await processBatch(client, batch, stats);
      
      stats.batches++;
      
      // Log progress after each batch
      logger.info(`Completed batch ${i+1}/${batches.length}`, { 
        processed: stats.processed,
        inserted: stats.inserted,
        updated: stats.updated,
        errors: stats.errors,
        skipped: stats.skipped
      });
    }
    
    // Save the updated list of problematic stations
    saveProblematicStations();
    
    const endTime = new Date();
    const durationSec = (endTime - startTime) / 1000;
    
    logger.info('Data sync completed successfully', { 
      durationSec,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      stats
    });
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    logger.error('Error during data sync', {
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    client.release();
    await pool.end();
    logger.info('Database connection pool closed');
    logger.close();
  }
}

// Run the function
syncRainfallData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 