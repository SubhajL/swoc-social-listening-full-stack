// TMD data sync script (ES Module version) with enhanced logging
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

// Configuration and globals
logger.logMemoryUsage('Startup');

// Check if we're running in preserve data mode
const preserveDataMode = process.argv.includes('--preserve-data') || process.env.PRESERVE_DATA === 'true';

logger.info('TMD Sync job starting', {
  component: 'Job',
  operation: 'TMDSyncStart',
  data: {
    scriptPath: import.meta.url,
    workingDirectory: process.cwd(),
    nodeVersion: process.version,
    preserveDataMode,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TZ: process.env.TZ
    }
  }
});

// If preserve data mode is enabled, log it clearly
if (preserveDataMode) {
  logger.info('Data preservation mode is ENABLED', {
    component: 'Job',
    operation: 'DataProtection',
    data: {
      description: 'Existing data will be preserved when new values are empty or null'
    }
  });
}

// Helper function to mask sensitive values for logging
function maskValue(value) {
  if (!value) return 'not set';
  if (value.length <= 6) return value; // Short enough to show
  return value.substring(0, 3) + '...' + value.substring(value.length - 3);
}

// Log memory usage at the start
logger.logMemoryUsage('Startup');

// API configuration with updated endpoints provided by the user
const TMD_API_BASE_URL = 'https://apidoag.opendata.go.th/api/v3';
const TMD_API_KEY = process.env.TMD_API_KEY;
const TMD_API_SECRET = process.env.TMD_API_SECRET;

// API endpoints
const TMD_WEATHER_STATION_ENDPOINT = '/stations/weather';
const TMD_RAINFALL_STATION_ENDPOINT = '/stations/rainfall';
const TMD_CURRENT_WEATHER_ENDPOINT = '/weather/stations/daily-weather';
const TMD_CURRENT_RAINFALL_ENDPOINT = '/weather/stations/daily-rainfall';

// Create axios config with headers
const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SWOC-TMD-Sync/1.0',
    'api-key': TMD_API_KEY,
    'secret-key': TMD_API_SECRET
  }
};

// Create an HTTP client with enhanced logging and retry logic
const axiosInstance = axios.create({
  timeout: 60000, // 60 seconds
  headers: axiosConfig.headers
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

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  connectionTimeoutMillis: 15000, // Increase timeout for potentially slower connections
  idleTimeoutMillis: 30000,
  application_name: 'tmd_sync_job' // Identify connection in pg_stat_activity
};

// Create a database pool with enhanced logging
let pool = null;
let rawPool = null;

try {
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
  pool = createLoggingDbPool(logger, dbConfig);
} catch (error) {
  logger.error('Failed to create database connection pool', {
    component: 'Database',
    operation: 'PoolCreate',
    error
  });
  process.exit(1);
}

// Statistics tracking
const stats = {
  weatherStations: 0,
  rainfallStations: 0,
  processedWeatherStations: 0,
  processedRainfallStations: 0,
  newWeatherEntries: 0,
  newRainfallEntries: 0,
  updatedWeatherEntries: 0,
  updatedRainfallEntries: 0,
  failedWeatherStations: 0,
  failedRainfallStations: 0,
  startTime: Date.now(),
  errors: []
};

/**
 * Fetch all TMD weather stations from the API
 */
async function fetchTMDWeatherStations() {
  logger.info('Fetching TMD weather stations from API', {
    component: 'API',
    operation: 'FetchWeatherStations'
  });
  
  try {
    const startTime = Date.now();
    
    // Build URL with updated endpoint format
    const stationUrl = `${TMD_API_BASE_URL}${TMD_WEATHER_STATION_ENDPOINT}`;
    
    logger.debug('Using weather station API URL', {
      component: 'API',
      operation: 'FetchWeatherStations',
      data: {
        url: stationUrl
      }
    });
    
    // Make API request using direct axios call
    const response = await axios.get(stationUrl, axiosConfig);
    
    // Extract stations from response data
    const stationsData = response.data;
    const stations = stationsData?.data?.stations || [];
    
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(stations)) {
      logger.warn('Unexpected API response format for weather stations', {
        component: 'API',
        operation: 'FetchWeatherStationsFormat',
        data: {
          responseType: typeof stations,
          response: stationsData
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched ${stations.length} TMD weather stations`, {
      component: 'API',
      operation: 'FetchWeatherStationsSuccess',
      duration,
      data: {
        count: stations.length,
        sample: stations.length > 0 ? stations[0] : null
      }
    });
    
    stats.weatherStations = stations.length;
    return stations;
  } catch (error) {
    logger.logError('Failed to fetch TMD weather stations', error, 'API', 'FetchWeatherStationsFailed');
    stats.errors.push({
      stage: 'fetchTMDWeatherStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch all TMD rainfall stations from the API
 */
async function fetchTMDRainfallStations() {
  logger.info('Fetching TMD rainfall stations from API', {
    component: 'API',
    operation: 'FetchRainfallStations'
  });
  
  try {
    const startTime = Date.now();
    
    // Build URL with updated endpoint format
    const stationUrl = `${TMD_API_BASE_URL}${TMD_RAINFALL_STATION_ENDPOINT}`;
    
    logger.debug('Using rainfall station API URL', {
      component: 'API',
      operation: 'FetchRainfallStations',
      data: {
        url: stationUrl
      }
    });
    
    // Make API request using direct axios call
    const response = await axios.get(stationUrl, axiosConfig);
    
    // Extract stations from response data
    const stationsData = response.data;
    const stations = stationsData?.data?.stations || [];
    
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(stations)) {
      logger.warn('Unexpected API response format for rainfall stations', {
        component: 'API',
        operation: 'FetchRainfallStationsFormat',
        data: {
          responseType: typeof stations,
          response: stationsData
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched ${stations.length} TMD rainfall stations`, {
      component: 'API',
      operation: 'FetchRainfallStationsSuccess',
      duration,
      data: {
        count: stations.length,
        sample: stations.length > 0 ? stations[0] : null
      }
    });
    
    stats.rainfallStations = stations.length;
    return stations;
  } catch (error) {
    logger.logError('Failed to fetch TMD rainfall stations', error, 'API', 'FetchRainfallStationsFailed');
    stats.errors.push({
      stage: 'fetchTMDRainfallStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch current weather data from TMD API
 */
async function fetchCurrentWeatherData() {
  logger.info('Fetching TMD current weather data from API', {
    component: 'API',
    operation: 'FetchCurrentWeather'
  });
  
  try {
    const startTime = Date.now();
    
    // Get current time in Thailand
    const now = new Date();
    const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    
    // Format date for API request (YYYY-MM-DD)
    const formattedDate = thailandTime.toISOString().split('T')[0];
    
    logger.debug('Using date for weather data request', {
      component: 'API',
      operation: 'DatePreparation',
      data: {
        utcNow: now.toISOString(),
        thailandTime: thailandTime.toISOString(),
        formattedDate
      }
    });
    
    // Build URL with updated endpoint format
    const weatherUrl = `${TMD_API_BASE_URL}${TMD_CURRENT_WEATHER_ENDPOINT}`;
    
    // Add date parameter if needed
    const urlWithDate = formattedDate ? `${weatherUrl}?date=${formattedDate}` : weatherUrl;
    
    logger.debug('Using current weather API URL', {
      component: 'API',
      operation: 'FetchCurrentWeather',
      data: {
        url: urlWithDate
      }
    });
    
    // Make API request using direct axios call
    const response = await axios.get(urlWithDate, axiosConfig);
    
    // Extract weather data from response
    const weatherData = response.data;
    const observations = weatherData?.data?.observations || [];
    
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(observations)) {
      logger.warn('Unexpected API response format for current weather data', {
        component: 'API',
        operation: 'FetchCurrentWeatherFormat',
        data: {
          responseType: typeof observations,
          response: weatherData
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched current weather data: ${observations.length} records`, {
      component: 'API',
      operation: 'FetchCurrentWeatherSuccess',
      duration,
      data: {
        count: observations.length,
        date: formattedDate,
        sample: observations.length > 0 ? observations[0] : null
      }
    });
    
    return observations;
  } catch (error) {
    logger.logError('Failed to fetch current weather data', error, 'API', 'FetchCurrentWeatherFailed');
    stats.errors.push({
      stage: 'fetchCurrentWeatherData',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch current rainfall data from TMD API
 */
async function fetchCurrentRainfallData() {
  logger.info('Fetching TMD current rainfall data from API', {
    component: 'API',
    operation: 'FetchCurrentRainfall'
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
    
    // Build URL with updated endpoint format
    const rainfallUrl = `${TMD_API_BASE_URL}${TMD_CURRENT_RAINFALL_ENDPOINT}`;
    
    // Add date parameter if needed
    const urlWithDate = formattedDate ? `${rainfallUrl}?date=${formattedDate}` : rainfallUrl;
    
    logger.debug('Using current rainfall API URL', {
      component: 'API',
      operation: 'FetchCurrentRainfall',
      data: {
        url: urlWithDate
      }
    });
    
    // Make API request using direct axios call
    const response = await axios.get(urlWithDate, axiosConfig);
    
    // Extract rainfall data from response
    const rainfallData = response.data;
    const observations = rainfallData?.data?.observations || [];
    
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(observations)) {
      logger.warn('Unexpected API response format for current rainfall data', {
        component: 'API',
        operation: 'FetchCurrentRainfallFormat',
        data: {
          responseType: typeof observations,
          response: rainfallData
        }
      });
      return [];
    }
    
    logger.info(`Successfully fetched current rainfall data: ${observations.length} records`, {
      component: 'API',
      operation: 'FetchCurrentRainfallSuccess',
      duration,
      data: {
        count: observations.length,
        date: formattedDate,
        sample: observations.length > 0 ? observations[0] : null
      }
    });
    
    return observations;
  } catch (error) {
    logger.logError('Failed to fetch current rainfall data', error, 'API', 'FetchCurrentRainfallFailed');
    stats.errors.push({
      stage: 'fetchCurrentRainfallData',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Save TMD weather station data to database
 */
async function saveWeatherStationData(stations) {
  logger.info(`Saving ${stations.length} TMD weather stations to database`, {
    component: 'Database',
    operation: 'SaveWeatherStations'
  });
  
  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  
  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const station of stations) {
      try {
        // Extract station data
        const stationName = station.station_name?.en || station.station_name || '';
        const stationNameTh = station.station_name?.th || station.station_name || '';
        
        // Insert or update station data with protection against empty values
        const query = `
          INSERT INTO thaiwater_tele_stations (
            tele_station_id,
            tele_station_name,
            tele_station_name_th,
            tele_station_oldcode,
            tele_station_lat,
            tele_station_long,
            tele_station_type,
            agency_id,
            province,
            amphure,
            tambon,
            data_source,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (tele_station_id) DO UPDATE SET
            tele_station_name = CASE WHEN $2 IS NOT NULL AND $2 != '' THEN $2 ELSE thaiwater_tele_stations.tele_station_name END,
            tele_station_name_th = CASE WHEN $3 IS NOT NULL AND $3 != '' THEN $3 ELSE thaiwater_tele_stations.tele_station_name_th END,
            tele_station_oldcode = CASE WHEN $4 IS NOT NULL AND $4 != '' THEN $4 ELSE thaiwater_tele_stations.tele_station_oldcode END,
            tele_station_lat = CASE WHEN $5 IS NOT NULL AND $5 != '' THEN $5 ELSE thaiwater_tele_stations.tele_station_lat END,
            tele_station_long = CASE WHEN $6 IS NOT NULL AND $6 != '' THEN $6 ELSE thaiwater_tele_stations.tele_station_long END,
            tele_station_type = CASE WHEN $7 IS NOT NULL AND $7 != '' THEN $7 ELSE thaiwater_tele_stations.tele_station_type END,
            agency_id = CASE WHEN $8 IS NOT NULL THEN $8 ELSE thaiwater_tele_stations.agency_id END,
            province = CASE WHEN $9 IS NOT NULL AND $9 != '' THEN $9 ELSE thaiwater_tele_stations.province END,
            amphure = CASE WHEN $10 IS NOT NULL AND $10 != '' THEN $10 ELSE thaiwater_tele_stations.amphure END,
            tambon = CASE WHEN $11 IS NOT NULL AND $11 != '' THEN $11 ELSE thaiwater_tele_stations.tambon END,
            data_source = $12,
            updated_at = NOW()
          RETURNING *
        `;
        
        const values = [
          station.id,
          stationName,
          stationNameTh,
          station.station_id || null,
          station.latitude || null,
          station.longitude || null,
          'Weather',
          14, // TMD agency ID
          station.province_name?.th || null,
          station.amphoe_name?.th || null,
          station.tambon_name?.th || null,
          'TMD'
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
        logger.logError(`Failed to save TMD weather station ID ${station.id}`, error, 'Database', 'SaveWeatherStationError');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('TMD weather stations saved to database', {
      component: 'Database',
      operation: 'SaveWeatherStationsSuccess',
      data: {
        inserted: insertCount,
        updated: updateCount,
        errors: errorCount
      }
    });
    
    return { insertCount, updateCount, errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.logError('Failed to save TMD weather stations', error, 'Database', 'SaveWeatherStationsFailed');
    return { insertCount: 0, updateCount: 0, errorCount: stations.length };
  } finally {
    client.release();
  }
}

/**
 * Save TMD rainfall station data to database
 */
async function saveRainfallStationData(stations) {
  logger.info(`Saving ${stations.length} TMD rainfall stations to database`, {
    component: 'Database',
    operation: 'SaveRainfallStations'
  });
  
  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  
  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const station of stations) {
      try {
        // Extract station data
        const stationName = station.station_name?.en || station.station_name || '';
        const stationNameTh = station.station_name?.th || station.station_name || '';
        
        // Insert or update station data with protection against empty values
        const query = `
          INSERT INTO thaiwater_tele_stations (
            tele_station_id,
            tele_station_name,
            tele_station_name_th,
            tele_station_oldcode,
            tele_station_lat,
            tele_station_long,
            tele_station_type,
            agency_id,
            province,
            amphure,
            tambon,
            data_source,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (tele_station_id) DO UPDATE SET
            tele_station_name = CASE WHEN $2 IS NOT NULL AND $2 != '' THEN $2 ELSE thaiwater_tele_stations.tele_station_name END,
            tele_station_name_th = CASE WHEN $3 IS NOT NULL AND $3 != '' THEN $3 ELSE thaiwater_tele_stations.tele_station_name_th END,
            tele_station_oldcode = CASE WHEN $4 IS NOT NULL AND $4 != '' THEN $4 ELSE thaiwater_tele_stations.tele_station_oldcode END,
            tele_station_lat = CASE WHEN $5 IS NOT NULL AND $5 != '' THEN $5 ELSE thaiwater_tele_stations.tele_station_lat END,
            tele_station_long = CASE WHEN $6 IS NOT NULL AND $6 != '' THEN $6 ELSE thaiwater_tele_stations.tele_station_long END,
            tele_station_type = CASE WHEN $7 IS NOT NULL AND $7 != '' THEN $7 ELSE thaiwater_tele_stations.tele_station_type END,
            agency_id = CASE WHEN $8 IS NOT NULL THEN $8 ELSE thaiwater_tele_stations.agency_id END,
            province = CASE WHEN $9 IS NOT NULL AND $9 != '' THEN $9 ELSE thaiwater_tele_stations.province END,
            amphure = CASE WHEN $10 IS NOT NULL AND $10 != '' THEN $10 ELSE thaiwater_tele_stations.amphure END,
            tambon = CASE WHEN $11 IS NOT NULL AND $11 != '' THEN $11 ELSE thaiwater_tele_stations.tambon END,
            data_source = $12,
            updated_at = NOW()
          RETURNING *
        `;
        
        const values = [
          station.id,
          stationName,
          stationNameTh,
          station.station_id || null,
          station.latitude || null,
          station.longitude || null,
          'Rainfall',
          14, // TMD agency ID
          station.province_name?.th || null,
          station.amphoe_name?.th || null,
          station.tambon_name?.th || null,
          'TMD'
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
        logger.logError(`Failed to save TMD rainfall station ID ${station.id}`, error, 'Database', 'SaveRainfallStationError');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('TMD rainfall stations saved to database', {
      component: 'Database',
      operation: 'SaveRainfallStationsSuccess',
      data: {
        inserted: insertCount,
        updated: updateCount,
        errors: errorCount
      }
    });
    
    return { insertCount, updateCount, errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.logError('Failed to save TMD rainfall stations', error, 'Database', 'SaveRainfallStationsFailed');
    return { insertCount: 0, updateCount: 0, errorCount: stations.length };
  } finally {
    client.release();
  }
}

/**
 * Save weather data to database
 */
async function saveWeatherData(weatherData) {
  logger.info(`Saving ${weatherData.length} weather observations to database`, {
    component: 'Database',
    operation: 'SaveWeatherData'
  });
  
  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  
  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const observation of weatherData) {
      try {
        // Extract required data
        const stationId = observation.station_id;
        const observationDate = observation.observation_date ? new Date(observation.observation_date) : null;
        
        if (!stationId || !observationDate) {
          logger.warn('Skipping weather observation with missing required fields', {
            component: 'Database',
            operation: 'SaveWeatherSkip',
            data: { observation }
          });
          errorCount++;
          continue;
        }
        
        // Insert or update weather data with protection against empty values
        const query = `
          INSERT INTO tmd_weather_observations (
            station_id,
            observation_date,
            temperature,
            humidity,
            pressure,
            rainfall,
            wind_speed,
            wind_direction,
            data_source,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (station_id, observation_date) DO UPDATE SET
            temperature = CASE WHEN $3 IS NOT NULL THEN $3 ELSE tmd_weather_observations.temperature END,
            humidity = CASE WHEN $4 IS NOT NULL THEN $4 ELSE tmd_weather_observations.humidity END,
            pressure = CASE WHEN $5 IS NOT NULL THEN $5 ELSE tmd_weather_observations.pressure END,
            rainfall = CASE WHEN $6 IS NOT NULL THEN $6 ELSE tmd_weather_observations.rainfall END,
            wind_speed = CASE WHEN $7 IS NOT NULL THEN $7 ELSE tmd_weather_observations.wind_speed END,
            wind_direction = CASE WHEN $8 IS NOT NULL THEN $8 ELSE tmd_weather_observations.wind_direction END,
            data_source = $9,
            updated_at = NOW()
          RETURNING *
        `;
        
        const values = [
          stationId,
          observationDate,
          observation.temperature || null,
          observation.humidity || null,
          observation.pressure || null,
          observation.rainfall || null,
          observation.wind_speed || null,
          observation.wind_direction || null,
          'TMD'
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
        logger.logError(`Failed to save weather observation for station ID ${observation.station_id}`, error, 'Database', 'SaveWeatherError');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Weather data saved to database', {
      component: 'Database',
      operation: 'SaveWeatherDataSuccess',
      data: {
        inserted: insertCount,
        updated: updateCount,
        errors: errorCount
      }
    });
    
    return { insertCount, updateCount, errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.logError('Failed to save weather data', error, 'Database', 'SaveWeatherDataFailed');
    return { insertCount: 0, updateCount: 0, errorCount: weatherData.length };
  } finally {
    client.release();
  }
}

/**
 * Save rainfall data to database
 */
async function saveRainfallData(rainfallData) {
  logger.info(`Saving ${rainfallData.length} rainfall observations to database`, {
    component: 'Database',
    operation: 'SaveRainfallData'
  });
  
  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  
  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const observation of rainfallData) {
      try {
        // Extract required data
        const stationId = observation.station_id;
        const observationDate = observation.observation_date ? new Date(observation.observation_date) : null;
        
        if (!stationId || !observationDate) {
          logger.warn('Skipping rainfall observation with missing required fields', {
            component: 'Database',
            operation: 'SaveRainfallSkip',
            data: { observation }
          });
          errorCount++;
          continue;
        }
        
        // Insert or update rainfall data with protection against empty values
        const query = `
          INSERT INTO thaiwater_rainfall (
            tele_station_id,
            rainfall_date,
            rainfall_datetime,
            rainfall_10m,
            rainfall_1h,
            rainfall_3h,
            rainfall_12h,
            rainfall_24h,
            rainfall_today,
            data_source,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (tele_station_id, rainfall_date) DO UPDATE SET
            rainfall_datetime = CASE WHEN $3 IS NOT NULL THEN $3 ELSE thaiwater_rainfall.rainfall_datetime END,
            rainfall_10m = CASE WHEN $4 IS NOT NULL THEN $4 ELSE thaiwater_rainfall.rainfall_10m END,
            rainfall_1h = CASE WHEN $5 IS NOT NULL THEN $5 ELSE thaiwater_rainfall.rainfall_1h END,
            rainfall_3h = CASE WHEN $6 IS NOT NULL THEN $6 ELSE thaiwater_rainfall.rainfall_3h END,
            rainfall_12h = CASE WHEN $7 IS NOT NULL THEN $7 ELSE thaiwater_rainfall.rainfall_12h END,
            rainfall_24h = CASE WHEN $8 IS NOT NULL THEN $8 ELSE thaiwater_rainfall.rainfall_24h END,
            rainfall_today = CASE WHEN $9 IS NOT NULL THEN $9 ELSE thaiwater_rainfall.rainfall_today END,
            data_source = $10,
            updated_at = NOW()
          RETURNING *
        `;
        
        const values = [
          stationId,
          observationDate,
          observationDate, // Use observation date for datetime as well
          null, // rainfall_10m not provided by TMD
          null, // rainfall_1h not provided by TMD
          null, // rainfall_3h not provided by TMD
          null, // rainfall_12h not provided by TMD
          observation.rainfall_24h || null,
          observation.rainfall_today || null,
          'TMD'
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
        logger.logError(`Failed to save rainfall observation for station ID ${observation.station_id}`, error, 'Database', 'SaveRainfallError');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Rainfall data saved to database', {
      component: 'Database',
      operation: 'SaveRainfallDataSuccess',
      data: {
        inserted: insertCount,
        updated: updateCount,
        errors: errorCount
      }
    });
    
    return { insertCount, updateCount, errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.logError('Failed to save rainfall data', error, 'Database', 'SaveRainfallDataFailed');
    return { insertCount: 0, updateCount: 0, errorCount: rainfallData.length };
  } finally {
    client.release();
  }
}

// Main function remains the same... 
// Main function remains the same... 