import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import pg from 'pg';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
}

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_WRITE_USER || 'swoc-uat-ssl-user',
  password: process.env.DB_WRITE_PASSWORD || 'c3dc7c8f659dd84f76b37057a37d75d2',
  host: process.env.DB_WRITE_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: process.env.DB_WRITE_PORT || 15434,
  database: process.env.DB_WRITE_DATABASE || 'swoc-uat-ssl',
  ssl: {
    rejectUnauthorized: false
  },
  // Set client encoding at connection time
  client_encoding: 'utf8'
});

// Known correct coordinates for Satun
const KNOWN_SATUN_COORDS = {
  lat: 6.6167,
  lng: 100.0667
};

// Add after the existing constants
const THAILAND_BOUNDS = {
  lat: { min: 5.5, max: 20.5 },  // Thailand's latitude range
  lng: { min: 97.3, max: 105.6 }  // Thailand's longitude range
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

function normalizeThaiText(text) {
  return text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
}

function isValidThaiCoordinate(lat, lng) {
  return (
    lat >= THAILAND_BOUNDS.lat.min && 
    lat <= THAILAND_BOUNDS.lat.max && 
    lng >= THAILAND_BOUNDS.lng.min && 
    lng <= THAILAND_BOUNDS.lng.max
  );
}

async function fetchCoordinatesWithRetry(searchQuery, maxRetries = 3, initialDelay = 2000) {
  let attempt = 1;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    try {
      logger.info(`Attempt ${attempt} of ${maxRetries} to fetch coordinates for: ${searchQuery}`);
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key not found');
      }

      // Properly encode the search query for Thai characters
      const normalizedQuery = normalizeThaiText(searchQuery);
      const encodedQuery = encodeURIComponent(normalizedQuery);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}&language=th&region=TH`;
      
      logger.info('Making request to Google Maps API...');

      const response = await axios.get(url, {
        headers: {
          'Accept-Charset': 'utf-8',
          'Accept-Language': 'th,en;q=0.9',
          'Content-Type': 'application/json; charset=utf-8'
        },
        responseType: 'json',
        responseEncoding: 'utf8'
      });

      if (response.data.status === 'OK' && response.data.results && response.data.results[0]) {
        const location = response.data.results[0].geometry.location;
        logger.info('Successfully found coordinates:', location);
        return location;
      }

      throw new Error(`No results found for query: ${searchQuery}`);
    } catch (error) {
      logger.error('Geocoding error:', {
        query: searchQuery,
        attempt,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (attempt === maxRetries) {
        throw error;
      }

      logger.info(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }
}

async function testSearchQueries(nameInThai, nameInEnglish) {
  logger.info('Testing different search queries for:', { 
    thai: nameInThai,
    english: nameInEnglish 
  });
  
  const searchQueries = [
    // English queries first as they tend to be more reliable
    `${nameInEnglish} Province, Thailand`,
    `${nameInEnglish}, Thailand`,
    // Thai queries with proper spacing and formatting
    `จังหวัด${normalizeThaiText(nameInThai)}`,
    `${normalizeThaiText(nameInThai)} จังหวัด`,
    `ศาลากลางจังหวัด${normalizeThaiText(nameInThai)}`
  ];

  const results = [];
  
  for (const searchQuery of searchQueries) {
    try {
      logger.info('Trying search query:', searchQuery);
      const coords = await fetchCoordinatesWithRetry(searchQuery);
      if (coords) {
        logger.info('Found coordinates for query:', { query: searchQuery, coords });
        results.push({ query: searchQuery, coords });
      }
    } catch (error) {
      logger.warn(`Failed to get coordinates for query: ${searchQuery}`, { error: error.message });
      continue;
    }
  }

  if (results.length === 0) {
    throw new Error('No valid coordinates found from any query');
  }

  // Calculate average coordinates from successful results
  const avgLat = results.reduce((sum, r) => sum + r.coords.lat, 0) / results.length;
  const avgLng = results.reduce((sum, r) => sum + r.coords.lng, 0) / results.length;
  logger.info('Average coordinates:', { lat: avgLat, lng: avgLng });

  // Find the result closest to the average
  let closestResult = results[0];
  let minDistance = calculateDistance(avgLat, avgLng, results[0].coords.lat, results[0].coords.lng);

  for (const result of results.slice(1)) {
    const distance = calculateDistance(avgLat, avgLng, result.coords.lat, result.coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestResult = result;
    }
  }

  logger.info('Most reliable coordinates:', {
    query: closestResult.query,
    coords: closestResult.coords,
    distanceFromAverage: minDistance
  });

  return closestResult.coords;
}

// Add at the beginning of the file
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    code: error.code,
    detail: error.detail
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    code: error.code,
    detail: error.detail
  });
});

async function testUpdateSatun() {
  logger.info('Connecting to database...');
  let client;
  
  try {
    client = await pool.connect();
    logger.info('Connected to database');
    
    // Test connection with a simple query first
    try {
      logger.info('Testing database connection...');
      const testResult = await client.query('SELECT NOW()');
      logger.info('Database connection test successful:', testResult.rows[0]);
    } catch (testError) {
      logger.error('Database connection test failed:', {
        error: testError.message,
        code: testError.code,
        detail: testError.detail
      });
      throw testError;
    }
    
    // Set client encoding to UTF-8 (try a different approach)
    try {
      logger.info('Setting database encoding...');
      await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED");
      await client.query("SET SESSION client_encoding = 'UTF8'");
      logger.info('Database encoding set');
    } catch (encodingError) {
      logger.error('Failed to set database encoding:', {
        error: encodingError.message,
        code: encodingError.code,
        detail: encodingError.detail
      });
      // Continue even if encoding setting fails
      logger.warn('Continuing with default encoding...');
    }
    
    // Get Satun province data
    let result;
    try {
      logger.info('Querying Satun province data...');
      result = await client.query({
        text: "SELECT id, name_th, name_en FROM provinces WHERE name_en = 'Satun'",
        rowMode: 'array'
      });
      logger.info('Query completed, checking results...', {
        rowCount: result.rowCount,
        fields: result.fields?.map(f => f.name)
      });
    } catch (queryError) {
      logger.error('Failed to query province data:', {
        error: queryError.message,
        code: queryError.code,
        detail: queryError.detail,
        position: queryError.position
      });
      throw queryError;
    }
    
    if (!result.rows || result.rows.length === 0) {
      const error = new Error('Satun province not found in database');
      logger.error('Province not found:', { error: error.message });
      throw error;
    }
    
    if (!result.rows[0] || result.rows[0].length !== 3) {
      const error = new Error(`Invalid province data format: ${JSON.stringify(result.rows[0])}`);
      logger.error('Invalid data format:', { 
        error: error.message,
        data: result.rows[0]
      });
      throw error;
    }
    
    const province = {
      id: result.rows[0][0],
      name_th: result.rows[0][1],
      name_en: result.rows[0][2]
    };
    
    logger.info('Found province:', {
      id: province.id,
      name_th: province.name_th,
      name_en: province.name_en
    });
    
    // Get current coordinates
    let currentCoords;
    try {
      logger.info('Querying current coordinates...');
      currentCoords = await client.query({
        text: 'SELECT latitude::float8, longitude::float8 FROM provinces WHERE id = $1',
        values: [province.id],
        rowMode: 'array'
      });
      logger.info('Coordinates query completed, checking results...', {
        rowCount: currentCoords.rowCount,
        fields: currentCoords.fields?.map(f => ({ 
          name: f.name, 
          dataTypeID: f.dataTypeID,
          format: f.format 
        }))
      });
    } catch (coordsError) {
      logger.error('Failed to query coordinates:', {
        error: coordsError.message,
        code: coordsError.code,
        detail: coordsError.detail,
        position: coordsError.position
      });
      throw coordsError;
    }
    
    if (!currentCoords.rows || currentCoords.rows.length === 0) {
      const error = new Error(`No coordinates found for province ID ${province.id}`);
      logger.error('Coordinates not found:', { error: error.message });
      throw error;
    }
    
    if (!currentCoords.rows[0] || currentCoords.rows[0].length !== 2) {
      const error = new Error(`Invalid coordinates format: ${JSON.stringify(currentCoords.rows[0])}`);
      logger.error('Invalid coordinates format:', {
        error: error.message,
        data: currentCoords.rows[0]
      });
      throw error;
    }
    
    // Log raw coordinate values before conversion
    logger.info('Raw coordinate values:', {
      latitude: {
        value: currentCoords.rows[0][0],
        type: typeof currentCoords.rows[0][0]
      },
      longitude: {
        value: currentCoords.rows[0][1],
        type: typeof currentCoords.rows[0][1]
      }
    });
    
    const current = {
      latitude: parseFloat(currentCoords.rows[0][0]),
      longitude: parseFloat(currentCoords.rows[0][1])
    };
    
    // Log converted values
    logger.info('Converted coordinate values:', {
      latitude: {
        value: current.latitude,
        type: typeof current.latitude
      },
      longitude: {
        value: current.longitude,
        type: typeof current.longitude
      }
    });
    
    if (isNaN(current.latitude) || isNaN(current.longitude)) {
      const error = new Error('Coordinates could not be converted to numbers');
      logger.error('Coordinate conversion failed:', {
        error: error.message,
        rawLatitude: currentCoords.rows[0][0],
        rawLongitude: currentCoords.rows[0][1]
      });
      throw error;
    }
    
    if (!isValidThaiCoordinate(current.latitude, current.longitude)) {
      logger.warn('Current coordinates are outside Thailand bounds:', {
        current: {
          lat: current.latitude,
          lng: current.longitude
        },
        bounds: THAILAND_BOUNDS
      });
    }
    
    logger.info('Current coordinates:', {
      ...current,
      isWithinThailand: isValidThaiCoordinate(current.latitude, current.longitude)
    });
    
    // Test search queries and get new coordinates
    const newCoordinates = await testSearchQueries(province.name_th, province.name_en);
    
    // Calculate distances and differences
    const distanceFromCurrent = calculateDistance(
      current.latitude,
      current.longitude,
      newCoordinates.lat,
      newCoordinates.lng
    );
    
    const distanceFromKnown = calculateDistance(
      KNOWN_SATUN_COORDS.lat,
      KNOWN_SATUN_COORDS.lng,
      newCoordinates.lat,
      newCoordinates.lng
    );
    
    const currentDistanceFromKnown = calculateDistance(
      KNOWN_SATUN_COORDS.lat,
      KNOWN_SATUN_COORDS.lng,
      current.latitude,
      current.longitude
    );
    
    logger.info('Coordinate analysis:', {
      current: {
        lat: current.latitude,
        lng: current.longitude,
        distanceFromKnown: currentDistanceFromKnown
      },
      new: {
        lat: newCoordinates.lat,
        lng: newCoordinates.lng,
        distanceFromKnown: distanceFromKnown
      },
      differences: {
        lat: Math.abs(newCoordinates.lat - current.latitude),
        lng: Math.abs(newCoordinates.lng - current.longitude),
        distanceKm: distanceFromCurrent,
        improvement: currentDistanceFromKnown - distanceFromKnown
      }
    });
    
  } catch (error) {
    logger.error('Error in test:', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      code: error.code,
      detail: error.detail,
      where: error.where,
      hint: error.hint,
      position: error.position,
      severity: error.severity,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint
    });
    throw error;
  } finally {
    if (client) {
      try {
        logger.info('Releasing database connection...');
        await client.release();
        logger.info('Database connection released');
      } catch (releaseError) {
        logger.error('Error releasing client:', {
          error: releaseError instanceof Error ? releaseError.message : releaseError,
          stack: releaseError instanceof Error ? releaseError.stack : undefined
        });
      }
    }
    try {
      logger.info('Ending pool...');
      await pool.end();
      logger.info('Pool ended');
    } catch (poolError) {
      logger.error('Error ending pool:', {
        error: poolError instanceof Error ? poolError.message : poolError,
        stack: poolError instanceof Error ? poolError.stack : undefined
      });
    }
  }
}

async function testDatabaseConnection() {
  let client;
  try {
    logger.info('Connecting to database...');
    client = await pool.connect();
    logger.info('Connected to database');

    // Test with a simple query
    logger.info('Testing simple query...');
    const result = await client.query('SELECT NOW()');
    logger.info('Simple query result:', result.rows[0]);

    // Test provinces table
    logger.info('Testing provinces table...');
    const provinces = await client.query('SELECT COUNT(*) FROM provinces');
    logger.info('Provinces count:', provinces.rows[0]);

  } catch (error) {
    logger.error('Database test error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    if (client) {
      logger.info('Releasing database connection...');
      client.release();
      logger.info('Database connection released');
    }
    logger.info('Ending pool...');
    await pool.end();
    logger.info('Pool ended');
  }
}

// Run the test
testUpdateSatun().catch(error => {
  logger.error('Script failed:', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
}); 