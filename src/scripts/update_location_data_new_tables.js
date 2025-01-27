const { config } = require('dotenv');
const pg = require('pg');
const axios = require('axios');
const path = require('path');

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
}

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
});

// Enhanced connection setup
pool.on('connect', async (client) => {
  await client.query(`
    SET client_encoding TO 'UTF8';
    SET NAMES 'UTF8';
    SET client_min_messages TO WARNING;
    SET TIME ZONE 'Asia/Bangkok';
  `);
});

// Thailand's bounding box
const THAILAND_BOUNDS = {
  minLat: 5.613038,  // Southernmost point
  maxLat: 20.465143, // Northernmost point
  minLng: 97.343396, // Westernmost point
  maxLng: 105.636812 // Easternmost point
};

// Helper function to create search query (single format per type)
function createSearchQuery(type, data) {
  const { name_th, name_en, province_name_th, province_name_en } = data;
  
  // Handle special cases first
  if (type === 'province') {
    if (name_en === 'Bangkok' || name_th === 'กรุงเทพมหานคร') {
      return 'ศาลาว่าการกรุงเทพมหานคร';
    }
    // For provinces, use the full format
    return `ศาลากลางจังหวัด${name_th}`;
  } else {
    // For amphures
    if (province_name_en === 'Bangkok' || 
        province_name_th === 'กรุงเทพมหานคร') {
      return `สำนักงานเขต${name_th}`;
    }
    return `ที่ว่าการอำเภอ${name_th}`;
  }
}

// Helper function to check if coordinates are within Thailand
function isWithinThailand(lat, lng) {
  return lat >= THAILAND_BOUNDS.minLat && 
         lat <= THAILAND_BOUNDS.maxLat && 
         lng >= THAILAND_BOUNDS.minLng && 
         lng <= THAILAND_BOUNDS.maxLng;
}

// Helper function to calculate exponential backoff with jitter
function calculateBackoff(retryCount) {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
  const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
  return exponentialDelay + jitter;
}

// Helper function for progress logging
function logProgress(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const symbols = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  if (typeof message === 'string') {
    process.stdout.write(`[${timestamp}] ${symbols[type]} ${message}\n`);
  } else {
    const { message: msg, data } = message;
    const dataStr = data ? `: ${JSON.stringify(data, null, 2)}` : '';
    process.stdout.write(`[${timestamp}] ${symbols[type]} ${msg}${dataStr}\n`);
  }
}

// Geocoding function with retries
async function getCoordinates(query) {
  try {
    // Try different search patterns
    const searchQueries = [
      query,
      query + " ประเทศไทย",
      // Remove "ที่ว่าการ" prefix if it exists
      query.replace("ที่ว่าการ", ""),
      // Try just the amphur name
      query.replace("ที่ว่าการอำเภอ", "")
    ];

    for (const searchQuery of searchQueries) {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchQuery
        )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        const coordinates = {
          lat: result.geometry.location.lat.toString(),
          lng: result.geometry.location.lng.toString(),
          address: result.formatted_address
        };
        logProgress({
          message: 'Found valid coordinates',
          data: coordinates
        }, 'success');
        return coordinates;
      }
    }

    logProgress('No results found', 'warning');
    return null;
  } catch (error) {
    logProgress({
      message: 'Geocoding error',
      data: {
        error: error?.message || String(error)
      }
    }, 'error');
    return null;
  }
}

// Update province coordinates
async function updateProvinceCoordinates(client) {
  const result = await client.query(`
    SELECT id, name_th, name_en 
    FROM provinces_new 
    WHERE (lat IS NULL OR lng IS NULL)
    ORDER BY id;
  `);

  for (const province of result.rows) {
    const searchQuery = createSearchQuery('province', province);
    logProgress({
      message: 'Processing province',
      data: { id: province.id, name_th: province.name_th, query: searchQuery }
    });

    const coordinates = await getCoordinates(searchQuery);
    if (coordinates) {
      await client.query(
        'UPDATE provinces_new SET lat = $1, lng = $2 WHERE id = $3',
        [coordinates.lat, coordinates.lng, province.id]
      );
      logProgress({
        message: 'Updated province coordinates',
        data: { id: province.id, name_th: province.name_th, ...coordinates }
      }, 'success');
    } else {
      logProgress({
        message: 'Failed to get coordinates for province',
        data: { id: province.id, name_th: province.name_th }
      }, 'error');
    }
  }
}

// Update amphure coordinates
async function updateAmphureCoordinates(client) {
  const result = await client.query(`
    SELECT a.id, a.name_th, a.name_en, p.name_th as province_name_th, p.name_en as province_name_en
    FROM amphures_new a
    JOIN provinces_new p ON a.province_id = p.id
    WHERE (a.lat IS NULL OR a.lng IS NULL)
    ORDER BY a.id;
  `);

  for (const amphure of result.rows) {
    const searchQuery = createSearchQuery('amphure', amphure);
    logProgress({
      message: 'Processing amphure',
      data: { id: amphure.id, name_th: amphure.name_th, query: searchQuery }
    });

    const coordinates = await getCoordinates(searchQuery);
    if (coordinates) {
      await client.query(
        'UPDATE amphures_new SET lat = $1, lng = $2 WHERE id = $3',
        [coordinates.lat, coordinates.lng, amphure.id]
      );
      logProgress({
        message: 'Updated amphure coordinates',
        data: { id: amphure.id, name_th: amphure.name_th, ...coordinates }
      }, 'success');
    } else {
      logProgress({
        message: 'Failed to get coordinates for amphure',
        data: { id: amphure.id, name_th: amphure.name_th }
      }, 'error');
    }
  }
}

// Main function
async function main() {
  let client = null;
  try {
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Update provinces first
    logProgress('Starting province coordinates update...');
    await updateProvinceCoordinates(client);
    
    // Then update amphures
    logProgress('Starting amphure coordinates update...');
    await updateAmphureCoordinates(client);
    
    // Commit transaction
    await client.query('COMMIT');
    logProgress('Successfully updated all coordinates', 'success');
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    logProgress({
      message: 'Script failed',
      data: { error: error?.message || String(error) }
    }, 'error');
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the script
main().catch(error => {
  logProgress(`Script failed: ${error}`, 'error');
  process.exit(1);
}); 