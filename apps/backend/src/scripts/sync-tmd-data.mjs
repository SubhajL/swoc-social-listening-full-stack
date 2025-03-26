// Script to sync TMD data from API to database with enhanced logging
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

// Load environment variables from the backend .env file with explicit path
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
  jobType: 'TMD_SYNC',
  filename: 'tmd-sync.log',
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

// Log startup information and execution context
logger.info('TMD sync job starting', {
  component: 'JobControl',
  operation: 'Startup',
  data: {
    scriptPath: __filename,
    workingDirectory: process.cwd(),
    nodeVersion: process.version,
    isScheduled,
    argv: process.argv,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TZ: process.env.TZ,
      DB_HOST: maskValue(process.env.DB_HOST),
      DB_NAME: maskValue(process.env.DB_NAME),
      DB_USER: maskValue(process.env.DB_USER),
    }
  }
});

// Helper function to mask sensitive values for logging
function maskValue(value) {
  if (!value) return 'not set';
  if (value.length <= 6) return value; // Short enough to show
  return value.substring(0, 3) + '...' + value.substring(value.length - 3);
}

// Log memory usage at the start
logger.logMemoryUsage('Startup');

// API configuration for TMD
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// TMD rainfall data - Updated to use the working alternative endpoint from diagnostics
const TMD_RAINFALL_API_MID = '244';
const TMD_RAINFALL_API_EID = '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

// Create an HTTP client with enhanced logging and retry logic
const axiosInstance = axios.create({
  timeout: 60000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SWOC-TMD-Rainfall-Sync/1.0 (Contact: admin@swoc.org)'
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

// Initialize database pool
let pool = null;
let rawPool = null;

/**
 * Creates a connection pool to the database
 * @returns {Promise<Object>} Database connection pool
 */
async function createDatabasePool() {
  try {
    // Log available environment variables for debugging
    logger.debug('Available database environment variables', {
      component: 'Database',
      operation: 'EnvCheck',
      data: {
        DB_HOST: maskValue(process.env.DB_HOST),
        DB_PORT: process.env.DB_PORT || 'not set',
        DB_NAME: maskValue(process.env.DB_NAME),
        DB_USER: maskValue(process.env.DB_USER),
        DB_PASSWORD: process.env.DB_PASSWORD ? `[REDACTED]` : 'not set',
        DB_SSL: process.env.DB_SSL || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
      }
    });
    
    // Get database configuration from environment variables
    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      connectionTimeoutMillis: 15000, // Increase timeout for remote connection
      idleTimeoutMillis: 30000,
      application_name: 'tmd_sync_job' // Identify connection in pg_stat_activity
    };
    
    logger.info('Creating database pool', {
      component: 'Database',
      operation: 'PoolCreate',
      data: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        ssl: dbConfig.ssl ? 'enabled' : 'disabled',
        max: dbConfig.max,
        connectionTimeout: dbConfig.connectionTimeoutMillis
      }
    });
    
    // Output password debug info without revealing the actual password
    if (!dbConfig.password) {
      logger.warn('Database password is empty', {
        component: 'Database',
        operation: 'PoolCreate'
      });
    } else {
      logger.debug('Database password present', {
        component: 'Database',
        operation: 'PoolCreate',
        data: {
          passwordLength: '[REDACTED]'
        }
      });
    }
    
    // Create a regular PostgreSQL pool for error handling
    const { Pool } = pg;
    rawPool = new Pool(dbConfig);
    
    // Set up error handler on the raw pool
    rawPool.on('error', (err) => {
      logger.error('Unexpected error on idle client', {
        component: 'Database',
        operation: 'PoolError',
        error: err
      });
    });
    
    // Create enhanced pool for query logging
    const enhancedPool = createLoggingDbPool(logger, dbConfig);
    
    // Verify database connectivity before proceeding
    try {
      const client = await rawPool.connect();
      try {
        const testResult = await client.query('SELECT NOW() as time');
        logger.info('Database connection verified successfully', {
          component: 'Database',
          operation: 'ConnectionTest',
          data: {
            serverTime: testResult.rows[0].time
          }
        });
      } finally {
        client.release();
      }
    } catch (connError) {
      logger.error('Database connection test failed', {
        component: 'Database',
        operation: 'ConnectionTest',
        error: connError
      });
      throw connError; // Re-throw to be handled by the caller
    }
    
    return enhancedPool;
  } catch (error) {
    logger.error('Failed to create database pool', {
      component: 'Database',
      operation: 'PoolCreate',
      error
    });
    throw error;
  }
}

// Statistics tracking
const stats = {
  totalStations: 0,
  processedStations: 0,
  newRainfallEntries: 0,
  updatedRainfallEntries: 0,
  failedStations: 0,
  startTime: Date.now(),
  errors: []
};

/**
 * Create necessary database tables if they don't exist
 */
async function createTablesIfNeeded() {
  logger.info('Checking/creating TMD tables', {
    component: 'Database',
    operation: 'TableSetup'
  });
  
  try {
    const startTime = Date.now();
    
    // Check all relevant tables
    logger.debug('Checking existing tables', {
      component: 'Database',
      operation: 'TableCheck'
    });
    
    // Get list of all tables to understand what exists
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const existingTables = allTablesResult.rows.map(row => row.table_name);
    
    logger.debug(`Found ${existingTables.length} tables in database`, {
      component: 'Database',
      operation: 'TableCheck',
      data: { 
        tables: existingTables.slice(0, 20), // Log first 20 tables
        tableCount: existingTables.length
      }
    });
    
    // Check and handle thaiwater_tele_stations table
    if (!existingTables.includes('thaiwater_tele_stations')) {
      logger.info('Creating thaiwater_tele_stations table', {
        component: 'Database',
        operation: 'CreateTable'
      });
      
      try {
        await pool.query(`
          CREATE TABLE thaiwater_tele_stations (
            tele_station_id INTEGER PRIMARY KEY,
            tele_station_name VARCHAR(255),
            tele_station_name_th VARCHAR(255),
            tele_station_oldcode VARCHAR(50),
            tele_station_lat DECIMAL(10, 6),
            tele_station_long DECIMAL(10, 6),
            tele_station_type VARCHAR(50),
            agency_id INTEGER,
            ground_level DECIMAL(10, 2),
            left_bank DECIMAL(10, 2),
            right_bank DECIMAL(10, 2),
            is_warning BOOLEAN,
            province VARCHAR(100),
            amphure VARCHAR(100),
            tambon VARCHAR(100),
            data_source VARCHAR(10),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // Add spatial index
        await pool.query(`
          CREATE INDEX idx_thaiwater_tele_stations_coordinates 
          ON thaiwater_tele_stations(tele_station_lat, tele_station_long);
        `);
        
        // Add index for location
        await pool.query(`
          CREATE INDEX idx_thaiwater_tele_stations_location 
          ON thaiwater_tele_stations(province, amphure, tambon);
        `);
        
        logger.info('thaiwater_tele_stations table created successfully', {
          component: 'Database',
          operation: 'TableCreated'
        });
      } catch (error) {
        if (error.message.includes('already exists')) {
          logger.warn('thaiwater_tele_stations table already exists despite not found in information_schema', {
            component: 'Database',
            operation: 'TableExists',
            error
          });
        } else {
          throw error;
        }
      }
    } else {
      logger.debug('thaiwater_tele_stations table already exists', {
        component: 'Database',
        operation: 'TableExists'
      });
    }
    
    // First check if the new version of the table exists
    if (!existingTables.includes('thaiwater_rainfall_data_new')) {
      // If not, check if the old version exists
      if (!existingTables.includes('thaiwater_rainfall_data')) {
        logger.info('Creating rainfall data table', {
          component: 'Database',
          operation: 'CreateTable'
        });
        
        try {
          // Determine which table name to use - prefer thaiwater_rainfall_data_new if it's referenced elsewhere
          const targetTableName = 'thaiwater_rainfall_data_new';
          
          await pool.query(`
            CREATE TABLE ${targetTableName} (
              id SERIAL PRIMARY KEY,
              tele_station_id INTEGER REFERENCES thaiwater_tele_stations(tele_station_id),
              rainfall10m DECIMAL(10, 2),
              rainfall1h DECIMAL(10, 2),
              rainfall24h DECIMAL(10, 2),
              rainfall_datetime TIMESTAMP WITH TIME ZONE,
              data_source VARCHAR(10),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(tele_station_id, rainfall_datetime)
            );
          `);
          
          // Add index on tele_station_id and rainfall_datetime
          await pool.query(`
            CREATE INDEX idx_${targetTableName.replace(/\./g, '_')}_station_date 
            ON ${targetTableName}(tele_station_id, rainfall_datetime);
          `);
          
          // Add index on rainfall_datetime
          await pool.query(`
            CREATE INDEX idx_${targetTableName.replace(/\./g, '_')}_date 
            ON ${targetTableName}(rainfall_datetime);
          `);
          
          // Add index on data_source
          await pool.query(`
            CREATE INDEX idx_${targetTableName.replace(/\./g, '_')}_source 
            ON ${targetTableName}(data_source);
          `);
          
          logger.info(`${targetTableName} table created successfully`, {
            component: 'Database',
            operation: 'TableCreated'
          });
        } catch (error) {
          if (error.message.includes('already exists')) {
            logger.warn('Rainfall table already exists despite not found in information_schema', {
              component: 'Database',
              operation: 'TableExists',
              error
            });
          } else {
            throw error;
          }
        }
      } else {
        logger.debug('thaiwater_rainfall_data table already exists', {
          component: 'Database',
          operation: 'TableExists'
        });
      }
    } else {
      logger.debug('thaiwater_rainfall_data_new table already exists', {
        component: 'Database',
        operation: 'TableExists'
      });
    }
    
    // Check if data_source column exists in thaiwater_tele_stations
    try {
      const checkDataSourceColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_tele_stations' 
        AND column_name = 'data_source';
      `);
      
      if (checkDataSourceColumn.rows.length === 0) {
        logger.info('Adding data_source column to thaiwater_tele_stations', {
          component: 'Database',
          operation: 'AlterTable'
        });
        
        try {
          await pool.query(`
            ALTER TABLE thaiwater_tele_stations 
            ADD COLUMN data_source VARCHAR(10);
          `);
          
          await pool.query(`
            CREATE INDEX idx_thaiwater_tele_stations_data_source 
            ON thaiwater_tele_stations(data_source);
          `);
          
          logger.info('Added data_source column to thaiwater_tele_stations', {
            component: 'Database',
            operation: 'ColumnAdded'
          });
        } catch (error) {
          if (error.message.includes('already exists')) {
            logger.warn('data_source column already exists in thaiwater_tele_stations', {
              component: 'Database',
              operation: 'ColumnExists',
              error
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      logger.warn('Error checking/adding data_source column to thaiwater_tele_stations', {
        component: 'Database',
        operation: 'ColumnCheck',
        error
      });
    }
    
    // Check if data_source column exists in thaiwater_rainfall_data_new
    try {
      const checkDataSourceColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_rainfall_data_new' 
        AND column_name = 'data_source';
      `);
      
      if (checkDataSourceColumn.rows.length === 0) {
        logger.info('Adding data_source column to thaiwater_rainfall_data_new', {
          component: 'Database',
          operation: 'AlterTable'
        });
        
        try {
          await pool.query(`
            ALTER TABLE thaiwater_rainfall_data_new 
            ADD COLUMN data_source VARCHAR(10);
          `);
          
          await pool.query(`
            CREATE INDEX idx_thaiwater_rainfall_data_new_source 
            ON thaiwater_rainfall_data_new(data_source);
          `);
          
          logger.info('Added data_source column to thaiwater_rainfall_data_new', {
            component: 'Database',
            operation: 'ColumnAdded'
          });
        } catch (error) {
          if (error.message.includes('already exists')) {
            logger.warn('data_source column already exists in thaiwater_rainfall_data_new', {
              component: 'Database',
              operation: 'ColumnExists',
              error
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      logger.warn('Error checking/adding data_source column to thaiwater_rainfall_data_new', {
        component: 'Database',
        operation: 'ColumnCheck',
        error
      });
    }
    
    const duration = Date.now() - startTime;
    logger.info('TMD table setup completed', {
      component: 'Database',
      operation: 'TableSetupComplete',
      duration
    });
  } catch (error) {
    logger.error('Failed to create TMD tables', {
      component: 'Database',
      operation: 'TableSetupFailed',
      error
    });
    throw error;
  }
}

/**
 * Fetch TMD stations from the API
 */
async function fetchTmdStations() {
  logger.info('Fetching TMD stations from API', {
    component: 'API',
    operation: 'FetchStations'
  });
  
  try {
    const startTime = Date.now();
    
    // Build URL with query parameters (using the format from the working test script)
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_STATION_API_MID}&eid=${encodeURIComponent(TMD_STATION_API_EID)}`;
    
    // Make API request using GET instead of POST
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SWOC-Rainfall-Sync/1.0'
      }
    });
    
    const stations = response.data;
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(stations)) {
      logger.warn('Unexpected API response format for TMD stations', {
        component: 'API',
        operation: 'FetchStationsFormat',
        data: {
          responseType: typeof stations,
          response: stations
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched ${stations.length} TMD stations`, {
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
    logger.logError('Failed to fetch TMD stations', error, 'API', 'FetchStationsFailed');
    stats.errors.push({
      stage: 'fetchTmdStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch rainfall data directly from TMD API
 */
async function fetchTmdRainfallData() {
  logger.info('[API] [FetchTMDRainfall]: Fetching TMD rainfall data directly from API');
  
  try {
    // Create a stats object for this function
    const stats = {
      totalRecords: 0,
      validRecords: 0,
      errors: 0
    };
    
    // The API is returning 404 with the previous approach, so let's use the known working approach
    // from the TMD station API but with the rainfall API parameters
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_RAINFALL_API_MID}&eid=${encodeURIComponent(TMD_RAINFALL_API_EID)}`;
    
    logger.info('[API] [FetchTMDRainfall]: Making TMD rainfall API request to ' + url);
    
    // Use GET method instead of POST (which was returning 404)
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SWOC-TMD-Rainfall-Sync/1.0 (Contact: admin@swoc.org)'
      },
      timeout: 60000 // Increase timeout for potentially large response
    });
    
    // Check if the response has the expected structure
    if (!response.data || !Array.isArray(response.data)) {
      logger.error('[API] [FetchTMDRainfall]: Unexpected API response format', {
        responseType: typeof response.data,
        isArray: Array.isArray(response.data) ? 'yes' : 'no',
        sample: typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 200) : String(response.data).substring(0, 200)
      });
      return [];
    }
    
    const rainfallData = response.data;
    stats.totalRecords = rainfallData.length;
    
    logger.info('[API] [FetchTMDRainfall]: Received TMD rainfall data', {
      count: rainfallData.length,
      sample: rainfallData.length > 0 ? rainfallData[0] : null
    });
    
    // Process and validate the rainfall data
    const validRecords = rainfallData.map(record => {
      try {
        // Validate and transform TMD record format to match our database schema
        const stationId = parseInt(record.tele_station_id);
        if (isNaN(stationId)) {
          stats.errors++;
          logger.warn('[API] [InvalidRecord]: Station ID is not a number', { record });
          return null;
        }
        
        // Parse rainfall datetime
        const rainfallDateTime = new Date(record.rainfall_datetime);
        if (isNaN(rainfallDateTime.getTime())) {
          stats.errors++;
          logger.warn('[API] [InvalidRecord]: Invalid rainfall datetime', {
            stationId,
            datetime: record.rainfall_datetime
          });
          return null;
        }
        
        // Map TMD fields to our schema and return a valid record
        return {
          tele_station_id: stationId,
          rainfall_datetime: rainfallDateTime,
          rainfall10m: record.rainfall10m,
          rainfall1h: record.rainfall1h,
          rainfall3h: record.rainfall3h,
          rainfall24h: record.rainfall24h,
          rainfall_today: record.rainfall_today
        };
      } catch (err) {
        stats.errors++;
        logger.error('[API] [ProcessRecord]: Error processing TMD rainfall record', {
          error: err.message,
          record
        });
        return null;
      }
    }).filter(record => record !== null);
    
    stats.validRecords = validRecords.length;
    
    logger.info('[API] [FetchTMDRainfall]: TMD rainfall data fetch completed', {
      totalRecords: stats.totalRecords,
      validRecords: stats.validRecords,
      errors: stats.errors,
      sample: validRecords.length > 0 ? validRecords[0] : null
    });
    
    return validRecords;
  } catch (err) {
    logger.error('[API] [FetchTMDRainfall]: Failed to fetch TMD rainfall data', {
      error: err.message,
      stack: err.stack
    });
    return [];
  }
}

/**
 * Fetch and save TMD stations to the database
 */
async function fetchAndSaveStations() {
  try {
    logger.info('Fetching TMD stations', {
      component: 'API',
      operation: 'FetchStations'
    });
    
    const startTime = Date.now();
    
    // Build URL with query parameters (using the exact format from the working test script)
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_STATION_API_MID}&eid=${encodeURIComponent(TMD_STATION_API_EID)}`;
    
    logger.debug('Calling TMD stations API', {
      component: 'API',
      operation: 'ApiCall',
      data: { url }
    });
    
    // Use axios directly instead of the httpClient wrapper
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SWOC-TMD-Rainfall-Sync/1.0 (Contact: admin@swoc.org)'
      },
      timeout: 30000
    });
    
    const duration = Date.now() - startTime;
    
    logger.info(`Fetched TMD stations in ${duration}ms`, {
      component: 'API',
      operation: 'FetchStationsComplete',
      duration,
      data: {
        endpoint: url,
        statusCode: response.status,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not an array'
      }
    });
    
    // Check if we received a valid array response
    if (!Array.isArray(response.data)) {
      logger.warn('Unexpected API response format for TMD stations', {
        component: 'API',
        operation: 'ResponseFormat',
        data: {
          responseType: typeof response.data,
          response: JSON.stringify(response.data).substring(0, 200)
        }
      });
      return [];
    }
    
    const stations = response.data;
    const stationsCount = stations.length;
    
    logger.info(`Found ${stationsCount} TMD stations`, {
      component: 'API',
      operation: 'StationsCount'
    });
    
    if (stationsCount === 0) {
      logger.warn('No TMD stations found', {
        component: 'API',
        operation: 'StationsEmpty'
      });
      return [];
    }
    
    // Save stations to database
    logger.info('Saving TMD stations to database', {
      component: 'Database',
      operation: 'SaveStations'
    });
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const station of stations) {
        try {
          // Insert or update station
          const query = `
            INSERT INTO thaiwater_tele_stations (
              tele_station_id,
              tele_station_name,
              tele_station_lat,
              tele_station_long,
              province,
              amphure,
              tambon,
              data_source,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (tele_station_id) DO UPDATE SET
              tele_station_name = EXCLUDED.tele_station_name,
              tele_station_lat = EXCLUDED.tele_station_lat,
              tele_station_long = EXCLUDED.tele_station_long,
              province = EXCLUDED.province,
              amphure = EXCLUDED.amphure,
              tambon = EXCLUDED.tambon,
              data_source = EXCLUDED.data_source,
              updated_at = NOW()
          `;
          
          const params = [
            station.id || station.tele_station_id,
            station.name || station.tele_station_name,
            station.latitude || station.tele_station_lat,
            station.longitude || station.tele_station_long,
            station.province,
            station.district || station.amphure,
            station.subdistrict || station.tambon,
            'TMD'
          ];
          
          const result = await client.query(query, params);
          
          if (result.rowCount > 0) {
            if (result.command === 'INSERT') {
              savedCount++;
            } else {
              updatedCount++;
            }
          }
        } catch (error) {
          errorCount++;
          logger.error(`Error saving TMD station ${station.id || station.tele_station_id}`, {
            component: 'Database',
            operation: 'SaveStationError',
            error,
            data: { station }
          });
        }
      }
      
      await client.query('COMMIT');
      
      logger.info('TMD stations saved to database', {
        component: 'Database',
        operation: 'SaveStationsComplete',
        data: {
          totalStations: stationsCount,
          savedCount,
          updatedCount,
          errorCount
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    stats.totalStations = stationsCount;
    stats.processedStations = savedCount + updatedCount;
    
    return stations;
  } catch (error) {
    logger.error('Failed to fetch and save TMD stations', {
      component: 'API',
      operation: 'FetchStationsError',
      error
    });
    throw error;
  }
}

/**
 * Save rainfall data to database
 */
async function saveRainfallData(connection, rainfallData) {
  logger.info('[Job] [SaveRainfallData]: Saving rainfall data', { count: rainfallData.length });
  
  const stats = {
    inserted: 0,
    updated: 0,
    error: 0,
    skipped: 0
  };
  
  try {
    // Check what type of connection object we have
    const isClient = typeof connection.release === 'function';
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < rainfallData.length; i += batchSize) {
      batches.push(rainfallData.slice(i, i + batchSize));
    }
    
    logger.info('[Job] [BatchProcess]: Processing rainfall data in batches', { 
      totalRecords: rainfallData.length,
      batchSize,
      numBatches: batches.length,
      connectionType: isClient ? 'client' : 'pool'
    });
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      logger.info('[Job] [BatchProgress]: Processing rainfall batch', { 
        batch: i + 1, 
        totalBatches: batches.length,
        batchSize: batch.length 
      });
      
      // Start a transaction for this batch if we're using a client
      // For pool direct queries, we'll handle each record individually
      if (isClient) {
        await connection.query('BEGIN');
      }
      
      try {
        for (const record of batch) {
          try {
            // Extract data from record
            const stationId = record.tele_station_id;
            if (!stationId) {
              logger.warn('[Database] [InvalidStationId]: Missing station ID', { record });
              stats.error++;
              continue;
            }
            
            const rainfallDateTime = new Date(record.rainfall_datetime);
            if (isNaN(rainfallDateTime.getTime())) {
              logger.warn('[Database] [InvalidDate]: Invalid rainfall date', { 
                stationId, 
                dateString: record.rainfall_datetime 
              });
              stats.error++;
              continue;
            }
            
            // Get values with proper type handling
            const rainfall10m = record.rainfall10m !== null && record.rainfall10m !== undefined ? 
              parseFloat(record.rainfall10m) : null;
            const rainfall1h = record.rainfall1h !== null && record.rainfall1h !== undefined ? 
              parseFloat(record.rainfall1h) : null;
            const rainfall3h = record.rainfall3h !== null && record.rainfall3h !== undefined ? 
              parseFloat(record.rainfall3h) : null;
            const rainfall24h = record.rainfall24h !== null && record.rainfall24h !== undefined ? 
              parseFloat(record.rainfall24h) : null;
            const rainfallToday = record.rainfall_today !== null && record.rainfall_today !== undefined ? 
              parseFloat(record.rainfall_today) : null;
            
            // Use current time for created_at and updated_at (already in local time in the database)
            const now = new Date();
            
            // Check if record exists
            const checkQuery = `
              SELECT id FROM thaiwater_rainfall_data_new 
              WHERE tele_station_id = $1 AND rainfall_datetime = $2
            `;
            
            const checkResult = await connection.query(checkQuery, [stationId, rainfallDateTime]);
            
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
              
              await connection.query(insertQuery, [
                stationId, rainfall10m, rainfall1h, rainfall3h,
                rainfall24h, rainfallToday, rainfallDateTime, 'TMD',
                now, now
              ]);
              
              stats.inserted++;
              
              logger.debug('[Database] [RainfallInsert]: Inserted rainfall data for station ' + stationId, {
                stationId,
                date: rainfallDateTime.toISOString(),
                rainfallToday
              });
            } else {
              // Update existing record
              const existingId = checkResult.rows[0].id;
              
              const updateQuery = `
                UPDATE thaiwater_rainfall_data_new SET 
                  rainfall10m = $1, rainfall1h = $2, rainfall3h = $3,
                  rainfall24h = $4, rainfall_today = $5, updated_at = $6,
                  data_source = 'TMD'
                WHERE id = $7
              `;
              
              await connection.query(updateQuery, [
                rainfall10m, rainfall1h, rainfall3h,
                rainfall24h, rainfallToday, now, existingId
              ]);
              
              stats.updated++;
              
              logger.debug('[Database] [RainfallUpdate]: Updated rainfall data for station ' + stationId, {
                stationId,
                date: rainfallDateTime.toISOString(),
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
        
        // Commit transaction if using client
        if (isClient) {
          await connection.query('COMMIT');
        }
        
      } catch (err) {
        // Rollback transaction on error if using client
        if (isClient) {
          await connection.query('ROLLBACK');
        }
        logger.error('[Database] [BatchError]: Error processing batch ' + (i + 1), {
          error: err.message,
          stack: err.stack
        });
      }
    }
    
    logger.info('[Job] [SaveRainfallSuccess]: Rainfall data saved successfully', { stats });
    return stats;
    
  } catch (err) {
    logger.error('[Job] [SaveRainfallError]: Error saving rainfall data', {
      error: err.message,
      stack: err.stack
    });
    return stats;
  }
}

/**
 * Update sync status in the database
 */
async function updateSyncStatus(success) {
  try {
    const timestamp = new Date();
    const query = `
      INSERT INTO sync_status (
        sync_type,
        sync_timestamp,
        success,
        created_at
      ) VALUES ($1, $2, $3, NOW())
    `;
    
    await pool.query(query, ['TMD', timestamp, success]);
    
    logger.info('Updated sync status', {
      component: 'Database',
      operation: 'UpdateSyncStatus',
      data: {
        syncType: 'TMD',
        timestamp,
        success
      }
    });
  } catch (error) {
    logger.error('Failed to update sync status', {
      component: 'Database',
      operation: 'UpdateSyncStatusError',
      error
    });
  }
}

/**
 * Main function to run the TMD sync job
 */
async function main() {
  let success = false;
  
  try {
    // Log environment information
    logger.logEnvironment();
    
    // Create database pool
    pool = await createDatabasePool();
    
    // Create necessary tables
    await createTablesIfNeeded();
    
    // First fix any JSON formatted station names in the database
    logger.info('Fixing any JSON-formatted station names in the database', {
      component: 'Database',
      operation: 'FixStationNames'
    });
    
    try {
      // Update station names that are in JSON format
      const fixStationNameQuery = `
        UPDATE thaiwater_tele_stations
        SET tele_station_name = 
          CASE 
            WHEN tele_station_name LIKE '{%"th"%:%"%"}' 
            THEN (tele_station_name::json->>'th')
            ELSE tele_station_name
          END,
        tele_station_name_th = 
          CASE 
            WHEN tele_station_name LIKE '{%"th"%:%"%"}' 
            THEN (tele_station_name::json->>'th')
            WHEN tele_station_name_th IS NULL
            THEN tele_station_name
            ELSE tele_station_name_th
          END
        WHERE tele_station_name LIKE '{%:%}' OR tele_station_name_th IS NULL
      `;
      
      const fixResult = await pool.query(fixStationNameQuery);
      
      logger.info(`Fixed ${fixResult.rowCount} JSON-formatted station names`, {
        component: 'Database',
        operation: 'FixStationNames'
      });
    } catch (error) {
      logger.warn('Error fixing JSON-formatted station names', {
        component: 'Database',
        operation: 'FixStationNames',
        error
      });
    }
    
    // Initialize stats object
    const stats = {
      totalStations: 0,
      processedStations: 0,
      newRainfallEntries: 0,
      updatedRainfallEntries: 0,
      failedStations: 0,
      startTime: Date.now(),
      errors: [],
    };
    
    // Check if we only want to test the connection
    if (process.argv.includes('--test-connection')) {
      logger.info('[JobControl] [TestConnection]: Running in test connection mode only');
      
      // Verify database connection works
      const dbTest = await pool.query('SELECT NOW()');
      if (dbTest.rows && dbTest.rows.length > 0) {
        logger.info('[Database] [TestConnectionSuccess]: Database connection successful');
      }
      
      // Try fetching a small amount of TMD rainfall data
      const rainfallData = await fetchTmdRainfallData();
      if (rainfallData && rainfallData.length > 0) {
        logger.info('[API] [TestConnectionSuccess]: TMD API connection successful', {
          recordCount: rainfallData.length,
          sample: rainfallData[0]
        });
      } else {
        logger.warn('[API] [TestConnectionEmpty]: Connected but received no TMD rainfall data');
      }
      
      logger.info('[JobControl] [TestConnectionComplete]: Connection test complete');
      return stats;
    }

    // Fetch rainfall data directly from TMD API
    logger.info('Fetching TMD rainfall data directly from API', {
      component: 'API',
      operation: 'FetchTMDRainfall'
    });
    
    // Fetch rainfall data directly from TMD API
    const rainfallData = await fetchTmdRainfallData();
    
    if (rainfallData && rainfallData.length > 0) {
      logger.info('[API] [FetchSuccess]: Successfully fetched TMD rainfall data', {
        count: rainfallData.length
      });
      
      // Check if pool has connect method, otherwise use direct query
      try {
        if (typeof pool.connect === 'function') {
          // Use transaction with client
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            // Save rainfall data to database
            const rainfallResults = await saveRainfallData(client, rainfallData);
            
            // Commit the transaction
            await client.query('COMMIT');
            
            // Update statistics
            logger.info('[JobControl] [SyncComplete]: TMD sync process completed successfully', {
              data: {
                totalRecords: rainfallData.length,
                inserted: rainfallResults.inserted,
                updated: rainfallResults.updated,
                errors: rainfallResults.error
              }
            });
            
            stats.newRainfallEntries = rainfallResults.inserted;
            stats.updatedRainfallEntries = rainfallResults.updated;
            stats.errors = rainfallResults.errors;
            
            success = true;
          } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error('[JobControl] [SyncFailed]: TMD sync process failed', {
              error: error.message,
              stack: error.stack
            });
            
            throw error;
          } finally {
            client.release();
          }
        } else {
          // Use pool directly without transaction for simpler implementation
          logger.info('[Database] [DirectQuery]: Using direct pool query without transaction');
          
          // Save rainfall data to database using pool directly
          const rainfallResults = await saveRainfallData(pool, rainfallData);
          
          // Update statistics
          logger.info('[JobControl] [SyncComplete]: TMD sync process completed successfully', {
            data: {
              totalRecords: rainfallData.length,
              inserted: rainfallResults.inserted,
              updated: rainfallResults.updated,
              errors: rainfallResults.error
            }
          });
          
          stats.newRainfallEntries = rainfallResults.inserted;
          stats.updatedRainfallEntries = rainfallResults.updated;
          stats.errors = rainfallResults.errors;
          
          success = true;
        }
      } catch (error) {
        logger.error('[JobControl] [SyncFailed]: TMD sync process failed', {
          error: error.message,
          stack: error.stack
        });
        
        throw error;
      }
    } else {
      logger.warn('[API] [NoData]: No TMD rainfall data received');
    }
    
    // Update sync status
    await updateSyncStatus(success);
    
    return stats;
  } catch (error) {
    logger.error('[Process] [MainError]: Error in main function', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    // Close database pool
    if (pool) {
      try {
        // Add a flag property on the pool to track closure status
        if (!pool._customClosureFlag) {
          pool._customClosureFlag = true;
          logger.info('[Database] [PoolEnd]: Closing database pool');
          await pool.end();
          logger.info('[Database] [PoolEndSuccess]: Database pool closed successfully');
          logger.info('[Database] [PoolClosed]: Database pool has been closed');
        } else {
          logger.debug('[Database] [PoolSkip]: Pool already marked for closure, skipping');
        }
      } catch (error) {
        logger.error('[Database] [PoolCloseError]: Error closing database pool', {
          error: error.message,
          stack: error.stack
        });
      }
    }
  }
}

// Make sure to properly close the pool at the end of the script
process.on('exit', async () => {
  if (pool) {
    try {
      // Add a flag to track if the pool has already been closed
      if (!pool._customClosureFlag && !pool._ending && !pool._ended) {
        pool._customClosureFlag = true;
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
  
  if (rawPool) {
    try {
      // Add a flag to track if the rawPool has already been closed
      if (!rawPool._customClosureFlag && !rawPool._ending && !rawPool._ended) {
        rawPool._customClosureFlag = true;
        await rawPool.end();
      }
    } catch (error) {
      // Already logged above
    }
  }
});

// Handle unexpected termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, cleaning up...');
  if (pool) {
    try {
      // Add a flag to track if the pool has already been closed
      if (!pool._customClosureFlag && !pool._ending && !pool._ended) {
        pool._customClosureFlag = true;
        await pool.end();
        logger.info('Database connection pool closed properly');
      }
    } catch (error) {
      logger.error('Error closing database pool', { error });
    }
  }
  
  if (rawPool) {
    try {
      // Add a flag to track if the rawPool has already been closed
      if (!rawPool._customClosureFlag && !rawPool._ending && !rawPool._ended) {
        rawPool._customClosureFlag = true;
        await rawPool.end();
      }
    } catch (error) {
      // Already logged above
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up...');
  if (pool) {
    try {
      // Add a flag to track if the pool has already been closed
      if (!pool._customClosureFlag && !pool._ending && !pool._ended) {
        pool._customClosureFlag = true;
        await pool.end();
        logger.info('Database connection pool closed properly');
      }
    } catch (error) {
      logger.error('Error closing database pool', { error });
    }
  }
  
  if (rawPool) {
    try {
      // Add a flag to track if the rawPool has already been closed
      if (!rawPool._customClosureFlag && !rawPool._ending && !rawPool._ended) {
        rawPool._customClosureFlag = true;
        await rawPool.end();
      }
    } catch (error) {
      // Already logged above
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
      if (!pool._customClosureFlag && !pool._ending && !pool._ended) {
        pool._customClosureFlag = true;
        pool.end().finally(() => {
          if (rawPool) {
            if (!rawPool._customClosureFlag && !rawPool._ending && !rawPool._ended) {
              rawPool._customClosureFlag = true;
              rawPool.end().finally(() => {
                process.exit(1);
              });
            } else {
              process.exit(1);
            }
          } else {
            process.exit(1);
          }
        });
      } else {
        if (rawPool) {
          if (!rawPool._customClosureFlag && !rawPool._ending && !rawPool._ended) {
            rawPool._customClosureFlag = true;
            rawPool.end().finally(() => {
              process.exit(1);
            });
          } else {
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      }
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
  
  if (rawPool) {
    try {
      rawPool.end().catch(() => {});
    } catch (e) {
      // Ignore errors on forced exit
    }
  }
  
  process.exit(0);
}, MAX_RUNTIME_MS);

// Allow the timeout to be unref'd so it doesn't keep the process alive
forceExitTimeout.unref();

// Run the main function
main().catch(err => {
  logger.error('Error in main function', {
    component: 'Process',
    operation: 'MainError',
    error: err
  });
  process.exit(1);
}); 