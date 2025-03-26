// HII (ThaiWater) data sync script (ES Module version) with enhanced logging
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axiosRetry from 'axios-retry';

// Import enhanced logging utilities
import { createEnhancedLogger } from '../utils/enhanced-logger.js';
import { createLoggingDbPool } from '../utils/db-logger.js';
import { createLoggingHttpClient } from '../utils/http-logger.js';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Load environment variables with explicit path
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
  console.warn(`Warning: .env file not found at ${envPath}, using process.env or default values`);
}

// Determine if this is being run as part of the scheduler
const isScheduled = process.argv.includes('--scheduled') || 
                    process.env.NODE_ENV === 'production' ||
                    process.env.SCHEDULER_MODE === 'true';

// Create enhanced logger
const logger = createEnhancedLogger({
  jobType: 'HII_SYNC',
  filename: 'hii-sync.log',
  isScheduled
});

// Verify essential environment variables before attempting to connect
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('Missing critical environment variables for database connection', {
    component: 'Environment',
    operation: 'Validation',
    data: {
      missing: missingVars
    }
  });
  process.exit(1);
}

// Check if we're running in data preservation mode
const preserveDataMode = process.argv.includes('--preserve-data') || process.env.PRESERVE_DATA === 'true';

// Log startup information
logger.info('HII sync job starting', {
  component: 'Job',
  operation: 'HIISyncStart',
  data: {
    scriptPath: import.meta.url,
    workingDirectory: process.cwd(),
    nodeVersion: process.version,
    preserveDataMode,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      TZ: process.env.TZ || 'UTC'
    }
  }
});

// If data preservation mode is enabled, log it clearly
if (preserveDataMode) {
  logger.info('Data preservation mode is ENABLED', {
    component: 'Job',
    operation: 'DataProtection',
    data: {
      description: 'Existing data will be preserved when new values are empty or null'
    }
  });
}

// Log memory usage at the start
logger.logMemoryUsage('Startup');

// API configuration with exact URLs that work in the browser
const THAIWATER_STATION_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=264&eid=skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';
const THAIWATER_RAINFALL_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=98&eid=ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

// For adding date parameter to rainfall URL
const RAINFALL_DATE_PARAM = '&start_date=';

// Create an HTTP client with enhanced logging and retry logic
const axiosInstance = axios.create({
  timeout: 60000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SWOC-HII-Rainfall-Sync/1.0'
  }
});

// Apply exponential backoff retry strategy for network issues
axiosRetry(axiosInstance, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors and 5xx responses
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  }
});

const httpClient = createLoggingHttpClient(logger, axiosInstance);

// Database connection pool
let pool;

/**
 * Initialize database connection
 */
async function initDatabase() {
  logger.info('Initializing database connection', {
    component: 'Database',
    operation: 'InitConnection'
  });
  
  try {
    // Create a database connection pool
    pool = new pg.Pool({
      host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
      port: parseInt(process.env.DB_PORT || '15435'),
      database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
      user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
      password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
      ssl: { rejectUnauthorized: false },
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000 // Close idle clients after 30 seconds
    });
    
    // Test the database connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      logger.info('Database connection established', {
        component: 'Database',
        operation: 'ConnectionSuccess',
        data: {
          time: result.rows[0].now,
          poolSize: pool.totalCount,
          idleConnections: pool.idleCount
        }
      });
    } finally {
      client.release();
    }
    
    return true;
  } catch (error) {
    logger.logError('Failed to initialize database connection', error, 'Database', 'ConnectionFailed');
    throw error;
  }
}

/**
 * Create required database tables if they don't exist
 */
async function createTablesIfNeeded() {
  logger.info('Checking and creating required database tables', {
    component: 'Database',
    operation: 'CreateTables'
  });
  
  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Create thaiwater_tele_stations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS thaiwater_tele_stations (
        tele_station_id INTEGER PRIMARY KEY,
        tele_station_name VARCHAR(255),
        tele_station_name_th VARCHAR(255),
        tele_station_oldcode VARCHAR(50),
        tele_station_lat VARCHAR(50),
        tele_station_long VARCHAR(50),
        tele_station_type VARCHAR(20),
        agency_id INTEGER,
        province VARCHAR(100),
        amphure VARCHAR(100),
        tambon VARCHAR(100),
        data_source VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create thaiwater_rainfall table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS thaiwater_rainfall_data_new (
        id SERIAL PRIMARY KEY,
        tele_station_id INTEGER NOT NULL,
        rainfall_datetime TIMESTAMP WITH TIME ZONE,
        rainfall10m REAL,
        rainfall1h REAL,
        rainfall3h REAL,
        rainfall24h REAL,
        rainfall_today REAL,
        data_source VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tele_station_id, rainfall_datetime)
      )
    `);
    
    // Create thaiwater_tele_stations_backup table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS thaiwater_tele_stations_backup (
        LIKE thaiwater_tele_stations INCLUDING ALL
      )
    `);
    
    // Create index on thaiwater_rainfall_data_new table for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thaiwater_rainfall_data_new_station_datetime
      ON thaiwater_rainfall_data_new(tele_station_id, rainfall_datetime)
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Database tables created or verified', {
      component: 'Database',
      operation: 'CreateTablesSuccess'
    });
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.logError('Failed to create database tables', error, 'Database', 'CreateTablesFailed');
    stats.errors.push({
      stage: 'createTablesIfNeeded',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    if (pool) {
      logger.info('Closing database connection', {
        component: 'Database',
        operation: 'CloseConnection',
        data: {
          poolSize: pool.totalCount,
          idleConnections: pool.idleCount
        }
      });
      
      await pool.end();
      
      logger.info('Database connection closed', {
        component: 'Database',
        operation: 'ConnectionClosed'
      });
    }
  } catch (error) {
    logger.logError('Error closing database connection', error, 'Database', 'CloseConnectionFailed');
  }
}

// Statistics tracking
let stats = {
  totalStations: 0,
  processedStations: 0,
  newRainfallEntries: 0,
  updatedRainfallEntries: 0,
  failedStations: 0,
  startTime: Date.now(),
  errors: [],
  stations: {
    total: 0,
    inserted: 0,
    updated: 0,
    errors: 0
  },
  rainfall: {
    total: 0,
    inserted: 0,
    updated: 0,
    errors: 0
  }
};

/**
 * Fetch all ThaiWater stations from the API
 */
async function fetchThaiWaterStations() {
  logger.info('Fetching ThaiWater stations from API', {
    component: 'API',
    operation: 'FetchStations'
  });
  
  try {
    const startTime = Date.now();
    
    // Use the exact URL that works in browser
    logger.debug('Using station API URL', {
      component: 'API',
      operation: 'FetchStations',
      data: {
        url: THAIWATER_STATION_URL
      }
    });
    
    // Make API request using direct axios call
    const response = await axios.get(THAIWATER_STATION_URL);
    
    const stations = response.data;
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(stations)) {
      logger.warn('Unexpected API response format for stations', {
        component: 'API',
        operation: 'FetchStationsFormat',
        data: {
          responseType: typeof stations,
          response: stations
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched ${stations.length} ThaiWater stations`, {
      component: 'API',
      operation: 'FetchStationsSuccess',
      duration,
      data: {
        count: stations.length,
        sample: stations.length > 0 ? stations[0] : null
      }
    });
    
    stats.totalStations = stations.length;
    return stations;
  } catch (error) {
    logger.logError('Failed to fetch ThaiWater stations', error, 'API', 'FetchStationsFailed');
    stats.errors.push({
      stage: 'fetchThaiWaterStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch rainfall data from ThaiWater API
 */
async function fetchRainfallData() {
  logger.info('Fetching ThaiWater rainfall data from API', {
    component: 'API',
    operation: 'FetchRainfall'
  });
  
  try {
    const startTime = Date.now();
    
    // Get current time in Thailand
    const now = new Date();
    const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    
    // Format date for API request (YYYY-MM-DD)
    const formattedDate = thailandTime.toISOString().split('T')[0];
    
    logger.debug('Using date for rainfall data request', {
      component: 'API',
      operation: 'DatePreparation',
      data: {
        utcNow: now.toISOString(),
        thailandTime: thailandTime.toISOString(),
        formattedDate
      }
    });
    
    // Add date parameter to the URL
    const urlWithDate = formattedDate ? `${THAIWATER_RAINFALL_URL}${RAINFALL_DATE_PARAM}${formattedDate}` : THAIWATER_RAINFALL_URL;
    
    logger.debug('Using rainfall API URL', {
      component: 'API',
      operation: 'FetchRainfall',
      data: {
        url: urlWithDate
      }
    });
    
    // Make API request using direct axios call
    const response = await axios.get(urlWithDate);
    
    const rainfallData = response.data;
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(rainfallData)) {
      logger.warn('Unexpected API response format for rainfall data', {
        component: 'API',
        operation: 'FetchRainfallFormat',
        data: {
          responseType: typeof rainfallData,
          response: rainfallData
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched rainfall data: ${rainfallData.length} records`, {
      component: 'API',
      operation: 'FetchRainfallSuccess',
      duration,
      data: {
        count: rainfallData.length,
        date: formattedDate,
        sample: rainfallData.length > 0 ? rainfallData[0] : null
      }
    });
    
    return rainfallData;
  } catch (error) {
    logger.logError('Failed to fetch rainfall data', error, 'API', 'FetchRainfallFailed');
    stats.errors.push({
      stage: 'fetchRainfallData',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Save station data to database
 */
async function saveStationData(stations) {
  logger.info(`Saving ${stations.length} station records to database`, {
    component: 'Database',
    operation: 'SaveStationData'
  });
  
  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  
  // Begin a database transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const station of stations) {
      try {
        // Extract name from JSON if needed
        let stationName = station.tele_station_name?.th || station.tele_station_name || '';
        let stationNameTh = station.tele_station_name?.th || station.tele_station_name || '';
        
        // Make sure we have valid values and never use empty values to overwrite existing data
        const query = `
            INSERT INTO thaiwater_tele_stations (
              tele_station_id,
              tele_station_name,
              tele_station_name_th,
              tele_station_oldcode,
              tele_station_lat,
              tele_station_long,
              agency_id,
              province,
              amphure,
              tambon,
              data_source,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (tele_station_id) DO UPDATE SET
              tele_station_name = CASE WHEN $2 IS NOT NULL AND $2 != '' THEN $2 ELSE thaiwater_tele_stations.tele_station_name END,
              tele_station_name_th = CASE WHEN $3 IS NOT NULL AND $3 != '' THEN $3 ELSE thaiwater_tele_stations.tele_station_name_th END,
              tele_station_oldcode = CASE WHEN $4 IS NOT NULL AND $4 != '' THEN $4 ELSE thaiwater_tele_stations.tele_station_oldcode END,
              tele_station_lat = CASE WHEN $5 IS NOT NULL AND $5 != '' THEN $5 ELSE thaiwater_tele_stations.tele_station_lat END,
              tele_station_long = CASE WHEN $6 IS NOT NULL AND $6 != '' THEN $6 ELSE thaiwater_tele_stations.tele_station_long END,
              agency_id = CASE WHEN $7 IS NOT NULL THEN $7 ELSE thaiwater_tele_stations.agency_id END,
              province = CASE WHEN $8 IS NOT NULL AND $8 != '' THEN $8 ELSE thaiwater_tele_stations.province END,
              amphure = CASE WHEN $9 IS NOT NULL AND $9 != '' THEN $9 ELSE thaiwater_tele_stations.amphure END,
              tambon = CASE WHEN $10 IS NOT NULL AND $10 != '' THEN $10 ELSE thaiwater_tele_stations.tambon END,
              data_source = $11,
              updated_at = NOW()
            RETURNING *
        `;
        
        const values = [
          station.id,
          stationName,
          stationNameTh,
          station.tele_station_oldcode,
          station.tele_station_lat,
          station.tele_station_long,
          station.agency_id,
          station.province || null,
          station.amphure || null,
          station.tambon || null,
          'ThaiWater'
        ];
        
        const result = await client.query(query, values);
        if (result.rowCount > 0) {
          if (result.command === 'INSERT') {
            insertCount++;
          } else {
            updateCount++;
          }
        }
      } catch (error) {
        errorCount++;
        logger.logError(`Error saving station ID ${station.id}`, error, 'Database', 'SaveStationFailed');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info(`Station data saved to database`, {
      component: 'Database',
      operation: 'SaveStationDataSuccess',
      data: {
        inserted: insertCount,
        updated: updateCount,
        errors: errorCount
      }
    });
    
    stats.stations.inserted = insertCount;
    stats.stations.updated = updateCount;
    stats.stations.errors = errorCount;
    
    return { insertCount, updateCount, errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.logError('Failed to save station data', error, 'Database', 'SaveStationDataFailed');
    stats.errors.push({
      stage: 'saveStationData',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return { insertCount: 0, updateCount: 0, errorCount: stations.length };
  } finally {
    client.release();
  }
}

/**
 * Save rainfall data to database
 */
async function saveRainfallData(client, rainfallData) {
  const startTime = new Date();
  logger.info('[Job] [SaveRainfallData]: Processing rainfall data from HII API', { count: rainfallData.length });
  
  // Create objects to track stats
  const stats = {
    inserted: 0,
    updated: 0,
    noChange: 0,
    error: 0,
    nullValues: 0,
    zeroValues: 0,
    total: rainfallData.length
  };
  
  // Prepare date for batching
  const batchSize = 500;
  const batches = [];
  
  for (let i = 0; i < rainfallData.length; i += batchSize) {
    batches.push(rainfallData.slice(i, i + batchSize));
  }
  
  logger.info('[Job] [BatchProcess]: Processing rainfall data in batches', { 
    totalRecords: rainfallData.length,
    batchSize,
    numBatches: batches.length
  });
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    logger.info('[Job] [BatchProgress]: Processing rainfall batch', { 
      batch: i + 1, 
      totalBatches: batches.length,
      batchSize: batch.length 
    });
    
    // Start a transaction for this batch
    await client.query('BEGIN');
    
    try {
      for (const record of batch) {
        try {
          const stationId = parseInt(record.tele_station_id);
          
          if (isNaN(stationId)) {
            logger.warn('[Database] [InvalidStationId]: Invalid station ID', { record });
            stats.error++;
            continue;
          }
          
          // Parse date from rainfall_datetime
          const rainfallDateTime = new Date(record.rainfall_datetime);
          if (isNaN(rainfallDateTime.getTime())) {
            logger.warn('[Database] [InvalidDate]: Invalid rainfall date', { 
              stationId, 
              dateString: record.rainfall_datetime 
            });
            stats.error++;
            continue;
          }
          
          // Set the date as start of day for rainfall_today
          const rainfallDate = new Date(rainfallDateTime);
          rainfallDate.setUTCHours(0, 0, 0, 0);
          
          // Count null values for tracking
          if (record.rainfall_today === null) {
            stats.nullValues++;
          } else if (parseFloat(record.rainfall_today) === 0) {
            stats.zeroValues++;
          }
          
          // Prepare values for insertion/update
          // Convert rainfall values to numbers where possible, preserve nulls
          const rainfall10m = record.rainfall10m !== null ? parseFloat(record.rainfall10m) : null;
          const rainfall1h = record.rainfall1h !== null ? parseFloat(record.rainfall1h) : null;
          const rainfall3h = record.rainfall3h !== null ? parseFloat(record.rainfall3h) : null;
          const rainfall24h = record.rainfall24h !== null ? parseFloat(record.rainfall24h) : null;
          const rainfallToday = record.rainfall_today !== null ? parseFloat(record.rainfall_today) : null;
          
          // Use current time for created_at and updated_at (already in local time in the database)
          const now = new Date();
          
          // Check if record exists
          const checkQuery = `
            SELECT id FROM thaiwater_rainfall_data_new 
            WHERE tele_station_id = $1 AND rainfall_datetime = $2
          `;
          
          const checkResult = await client.query(checkQuery, [stationId, rainfallDateTime]);
          
          if (checkResult.rows.length === 0) {
            // Insert new record
            const insertQuery = `
              INSERT INTO thaiwater_rainfall_data_new (
                tele_station_id, rainfall10m, rainfall1h, rainfall3h, 
                rainfall24h, rainfall_today, rainfall_datetime, data_source,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING id
            `;
            
            await client.query(insertQuery, [
              stationId, rainfall10m, rainfall1h, rainfall3h,
              rainfall24h, rainfallToday, rainfallDateTime, 'HII',
              now, now
            ]);
            
            stats.inserted++;
            
            logger.debug('[Database] [RainfallInsert]: Inserted rainfall data for station ' + stationId, {
              stationId,
              date: rainfallDate.toISOString(),
              rainfallToday
            });
          } else {
            // Update existing record
            const existingId = checkResult.rows[0].id;
            
            const updateQuery = `
              UPDATE thaiwater_rainfall_data_new SET 
                rainfall10m = $1, rainfall1h = $2, rainfall3h = $3,
                rainfall24h = $4, rainfall_today = $5, updated_at = $6,
                data_source = 'HII'
              WHERE id = $7
            `;
            
            await client.query(updateQuery, [
              rainfall10m, rainfall1h, rainfall3h,
              rainfall24h, rainfallToday, now, existingId
            ]);
            
            stats.updated++;
            
            logger.debug('[Database] [RainfallUpdate]: Updated rainfall data for station ' + stationId, {
              stationId,
              date: rainfallDate.toISOString(),
              rainfallToday
            });
          }
        } catch (err) {
          logger.error('[Database] [ProcessRainfallError]: Error processing rainfall record', {
            error: err.message,
            record,
            stack: err.stack
          });
          stats.error++;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      logger.error('[Database] [BatchError]: Error processing batch ' + (i + 1), {
        error: err.message,
        stack: err.stack
      });
    }
  }
  
  const endTime = new Date();
  const processingTimeMs = endTime - startTime;
  
  logger.info('[Job] [SaveRainfallComplete]: Rainfall data processing complete', { 
    stats,
    processingTimeSeconds: (processingTimeMs / 1000).toFixed(2)
  });
  
  return stats;
}

/**
 * Main function to run the HII data sync job
 */
async function runHIISync() {
  const startTime = Date.now();
  logger.info('Starting HII sync job', {
    component: 'Job',
    operation: 'HIISyncStart'
  });
  
  logger.logMemoryUsage('StartJob');
  
  try {
    // Initialize the stats object
    stats.startTime = new Date().toISOString();
    stats.stations.total = 0;
    stats.stations.inserted = 0;
    stats.stations.updated = 0;
    stats.stations.errors = 0;
    stats.rainfall.total = 0;
    stats.rainfall.inserted = 0;
    stats.rainfall.updated = 0;
    stats.rainfall.errors = 0;
    stats.errors = [];
    
    // Initialize the database connection
    await initDatabase();
    
    // Create tables if needed
    await createTablesIfNeeded();
    
    // Check if we only want to test API connection
    if (process.argv.includes('--test-connection')) {
      logger.info('Testing HII API connection only', {
        component: 'API',
        operation: 'TestConnection'
      });
      
      // Test the API connection
      const stations = await fetchThaiWaterStations();
      if (stations.length > 0) {
        logger.info(`Successfully connected to HII API and fetched ${stations.length} stations`, {
          component: 'API',
          operation: 'TestConnectionSuccess',
          data: { sampleStation: stations[0] }
        });
      }
      
      // Exit after testing the connection
      await closeDatabase();
      logger.info('API connection test complete, exiting...', {
        component: 'Job',
        operation: 'TestConnectionComplete'
      });
      process.exit(0);
      return;
    }
    
    // Only fetch stations to get a count, but don't save them
    const stations = await fetchThaiWaterStations();
    stats.stations.total = stations.length;
    logger.info(`Fetched ${stations.length} stations from HII API - will NOT be updating station data in database`, {
      component: 'API',
      operation: 'StationsFetched',
      data: {
        count: stations.length,
        skipSaving: true
      }
    });
    
    // Fetch rainfall data from HII API
    const rainfallData = await fetchRainfallData();
    stats.rainfall.total = rainfallData.length;
    
    logger.info(`Fetched ${rainfallData.length} rainfall records`, {
      component: 'API',
      operation: 'FetchComplete',
      data: {
        stationCount: stations.length,
        rainfallCount: rainfallData.length,
        sample: rainfallData.length > 0 ? rainfallData[0] : null
      }
    });
    
    // Skip saving stations to database
    logger.info('Skipping station data saving as per configuration', {
      component: 'Database',
      operation: 'SkipStationSave',
      data: {
        stationCount: stations.length
      }
    });
    
    // Save rainfall data to database
    if (rainfallData.length > 0) {
      const rainfallResults = await saveRainfallData(pool, rainfallData);
      stats.rainfall.inserted = rainfallResults.inserted;
      stats.rainfall.updated = rainfallResults.updated;
      stats.rainfall.errors = rainfallResults.error;
    }
    
    const duration = Date.now() - startTime;
    logger.info('HII sync job completed successfully', {
      component: 'Job',
      operation: 'HIISyncComplete',
      duration,
      data: {
        rainfall: stats.rainfall,
        errors: stats.errors.length
      }
    });
    
    logger.logMemoryUsage('EndJob');
    
    // Close the database connection pool
    if (pool) {
      try {
        // Check if the pool is not already closing or closed
        if (!pool._ending && !pool._ended) {
          await pool.end();
          logger.info('Database connection pool closed', {
            component: 'Database',
            operation: 'PoolClose'
          });
        }
      } catch (error) {
        logger.error('Error closing database pool', {
          component: 'Database',
          operation: 'PoolCloseError',
          error
        });
      }
    }
    
    // Log final memory usage
    logger.logMemoryUsage('Completion');
    
    return stats;
  } catch (error) {
    logger.logError('HII sync job failed', error, 'Job', 'HIISyncFailed');
    
    // Close the database connection on error
    await closeDatabase();
    
    return {
      ...stats,
      error: error.message,
      success: false
    };
  }
}

// Force process exit after maximum runtime (60 minutes) to prevent zombie processes
const MAX_RUNTIME_MS = 60 * 60 * 1000; // 60 minutes
const forceExitTimeout = setTimeout(() => {
  logger.warn('Force exiting script after maximum runtime reached', {
    component: 'Process',
    operation: 'ForceExit',
    data: {
      maxRuntimeMinutes: MAX_RUNTIME_MS / 60000
    }
  });

  // Try to close database connections gracefully
  if (pool) {
    try {
      pool.end().catch(() => {});
    } catch (e) {
      // Ignore errors on forced exit
    }
  }
  
  process.exit(0);
}, MAX_RUNTIME_MS);

// Allow the timeout to be unref'd so it doesn't keep the process alive
forceExitTimeout.unref();

// Run the main function
runHIISync().catch(err => {
  console.error('Unhandled error in HII sync process:', err);
  process.exit(1);
});

// Make sure to properly close the pool at the end of the script
process.on('exit', async () => {
  if (pool) {
    try {
      // Check if the pool is not already closing or closed
      if (!pool._ending && !pool._ended) {
        await pool.end();
        logger.info('Database connection pool closed properly on exit', {
          component: 'Database',
          operation: 'PoolClose'
        });
      }
    } catch (error) {
      logger.error('Error closing database pool on exit', {
        component: 'Database',
        operation: 'PoolCloseError',
        error
      });
    }
  }
});

// Handle unexpected termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, cleaning up...');
  if (pool) {
    try {
      // Check if the pool is not already closing or closed
      if (!pool._ending && !pool._ended) {
        await pool.end();
        logger.info('Database connection pool closed properly');
      }
    } catch (error) {
      logger.error('Error closing database pool', { error });
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up...');
  if (pool) {
    try {
      // Check if the pool is not already closing or closed
      if (!pool._ending && !pool._ended) {
        await pool.end();
        logger.info('Database connection pool closed properly');
      }
    } catch (error) {
      logger.error('Error closing database pool', { error });
    }
  }
  process.exit(0);
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    component: 'Process',
    operation: 'UncaughtException',
    error
  });
  
  if (pool) {
    try {
      pool.end().finally(() => {
        process.exit(1);
      });
    } catch (e) {
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    component: 'Process',
    operation: 'UnhandledRejection',
    error: reason
  });
}); 