import { Client } from '@googlemaps/google-maps-services-js';
import { config } from 'dotenv';
import { logger } from '../utils/logger';
import pg from 'pg';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface GoogleMapsResponse {
  status: string;
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address?: string;
  }>;
  error_message?: string;
}

// Helper function to normalize Thai text (preserving tone marks and vowels)
export function normalizeThaiText(text: string): string {
  // First, handle abbreviations
  const expandedText = text
    .replace(/จ\./g, 'จังหวัด')
    .replace(/อ\./g, 'อำเภอ')
    .replace(/ต\./g, 'ตำบล');

  // Then normalize Thai characters
  return expandedText
    .normalize('NFC')  // Use NFC instead of NFKC for Thai
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width spaces
    .replace(/\s+/g, '')  // Remove spaces
    .trim();
}

// Helper function to create search query (single format per type)
export function createSearchQuery(type: 'province' | 'amphure', data: { 
  name_th: string; 
  name_en: string; 
  province_name_th?: string; 
  province_name_en?: string; 
}): string {
  const { name_th, name_en, province_name_th, province_name_en } = data;
  
  // Pre-process the Thai name
  const normalizedNameTh = normalizeThaiText(name_th);
  
  // Handle special cases first
  if (type === 'province') {
    if (name_en === 'Bangkok' || normalizedNameTh === 'กรุงเทพมหานคร') {
      return 'ศาลาว่าการกรุงเทพมหานคร';
    }
    // For provinces, use the full format
    return `ศาลากลางจังหวัด${normalizedNameTh}`;
  } else {
    // For amphures
    if (province_name_en === 'Bangkok' || 
        normalizeThaiText(province_name_th || '') === 'กรุงเทพมหานคร') {
      return `สำนักงานเขต${normalizedNameTh}`;
    }
    return `ที่ว่าการอำเภอ${normalizedNameTh}`;
  }
}

// Helper function to check if coordinates are within Thailand
function isWithinThailand(lat: number, lng: number): boolean {
  return lat >= THAILAND_BOUNDS.minLat && 
         lat <= THAILAND_BOUNDS.maxLat && 
         lng >= THAILAND_BOUNDS.minLng && 
         lng <= THAILAND_BOUNDS.maxLng;
}

// Helper function to calculate exponential backoff with jitter
function calculateBackoff(retryCount: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
  const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
  return exponentialDelay + jitter;
}

// Validation function for Thai text
function validateThaiText(text: string): boolean {
  // Check if text contains valid Thai characters
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text);
}

// Geocoding function with retries
async function fetchCoordinates(searchQuery: string): Promise<{ lat: number; lng: number } | null> {
  // Validate Thai text before proceeding
  if (!validateThaiText(searchQuery)) {
    logProgress(`Invalid Thai characters in query: ${searchQuery}`, 'error');
    return null;
  }

  const maxRetries = 5;
  let retryCount = 0;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not set');
  }

  while (retryCount < maxRetries) {
    try {
      logProgress(`[Attempt ${retryCount + 1}/${maxRetries}] Geocoding: ${searchQuery}`, 'info');
      
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}&language=th&region=TH`;
      
      const response = await axios.get<GoogleMapsResponse>(url, {
        headers: {
          'Accept-Charset': 'utf-8',
          'Content-Type': 'application/json; charset=utf-8',
          'Accept-Language': 'th,en;q=0.9',
          'User-Agent': 'SWOC-Location-Updater/1.0'
        },
        timeout: 10000,
        responseType: 'json',
        responseEncoding: 'utf8'
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        
        if (isWithinThailand(location.lat, location.lng)) {
          logProgress({
            message: 'Found valid coordinates',
            data: {
              lat: location.lat.toFixed(6),
              lng: location.lng.toFixed(6),
              address: response.data.results[0].formatted_address
            }
          }, 'success');
          return location;
        } else {
          logProgress({
            message: 'Found coordinates outside Thailand',
            data: {
              lat: location.lat.toFixed(6),
              lng: location.lng.toFixed(6),
              address: response.data.results[0].formatted_address
            }
          }, 'warning');
        }
      } else if (response.data.status === 'ZERO_RESULTS') {
        logProgress('No results found', 'warning');
        return null;
      } else if (response.data.status === 'OVER_QUERY_LIMIT') {
        const delay = calculateBackoff(retryCount);
        logProgress(`Rate limit hit. Waiting ${delay}ms...`, 'warning');
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logProgress({
          message: 'Unexpected response',
          data: {
            status: response.data.status,
            error: response.data.error_message
          }
        }, 'warning');
      }
    } catch (error) {
      logProgress({
        message: 'Geocoding error',
        data: {
          error: error instanceof Error ? error.message : String(error)
        }
      }, 'error');

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logProgress('Request timeout', 'warning');
        } else if (error.response?.status === 429) {
          const delay = calculateBackoff(retryCount);
          logProgress(`Rate limit hit. Waiting ${delay}ms...`, 'warning');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    retryCount++;
    if (retryCount < maxRetries) {
      const delay = calculateBackoff(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

// Helper function for progress logging
interface LogMessage {
  message: string;
  data?: any;
}

function logProgress(message: string | LogMessage, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
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

// Update province coordinates
async function updateProvinceCoordinates(client: pg.PoolClient): Promise<void> {
  try {
    logProgress('\n=== Starting Province Updates ===', 'info');
    const provinces = await client.query('SELECT id, name_th, name_en FROM provinces');
    logProgress(`Found ${provinces.rows.length} provinces to update`, 'info');

    for (let i = 0; i < provinces.rows.length; i++) {
      const province = provinces.rows[i];
      const progressPct = ((i + 1) / provinces.rows.length * 100).toFixed(1);
      logProgress(`\n[Province ${i + 1}/${provinces.rows.length} - ${progressPct}%] Processing: ${province.name_en} (${province.name_th})`, 'info');

      try {
        const searchQuery = createSearchQuery('province', province);
        logProgress(`Search query: ${searchQuery}`, 'info');
        
        const coordinates = await fetchCoordinates(searchQuery);

        if (coordinates) {
          const updateResult = await client.query(
            'UPDATE provinces SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING id, name_en, latitude, longitude',
            [coordinates.lat, coordinates.lng, province.id]
          );

          logProgress(`Updated coordinates for ${province.name_en}: (${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)})`, 'success');
        } else {
          logProgress(`Failed to find coordinates for ${province.name_en}`, 'error');
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logProgress(`Error processing ${province.name_en}: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    }
  } catch (error) {
    logProgress(`Error in updateProvinceCoordinates: ${error}`, 'error');
    throw error;
  }
}

// Update amphure coordinates
async function updateAmphureCoordinates(client: pg.PoolClient): Promise<void> {
  try {
    logProgress('\n=== Starting Amphure Updates ===', 'info');
    const amphures = await client.query(`
      SELECT a.id, a.name_th, a.name_en, p.name_th as province_name_th, p.name_en as province_name_en 
      FROM amphures a 
      JOIN provinces p ON a.province_id = p.id
    `);
    logProgress(`Found ${amphures.rows.length} amphures to update`, 'info');

    for (let i = 0; i < amphures.rows.length; i++) {
      const amphure = amphures.rows[i];
      const progressPct = ((i + 1) / amphures.rows.length * 100).toFixed(1);
      logProgress(`\n[Amphure ${i + 1}/${amphures.rows.length} - ${progressPct}%] Processing: ${amphure.name_en} (${amphure.name_th}) in ${amphure.province_name_en}`, 'info');

      try {
        const searchQuery = createSearchQuery('amphure', amphure);
        logProgress(`Search query: ${searchQuery}`, 'info');
        
        const coordinates = await fetchCoordinates(searchQuery);

        if (coordinates) {
          await client.query(
            'UPDATE amphures SET latitude = $1, longitude = $2 WHERE id = $3',
            [coordinates.lat, coordinates.lng, amphure.id]
          );
          logProgress(`Updated coordinates: (${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)})`, 'success');
        } else {
          logProgress(`Failed to find coordinates`, 'error');
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logProgress(`Error processing amphure: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    }
  } catch (error) {
    logProgress(`Error in updateAmphureCoordinates: ${error}`, 'error');
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  let client;
  try {
    logProgress('\n=== Starting Location Update Process ===', 'info');
    client = await pool.connect();
    logProgress('Connected to database', 'success');

    // Start transaction
    await client.query('BEGIN');
    logProgress('Started transaction', 'success');

    // Update provinces first
    await updateProvinceCoordinates(client);
    logProgress('\nCompleted all province updates', 'success');

    // Then update amphures
    await updateAmphureCoordinates(client);
    logProgress('\nCompleted all amphure updates', 'success');

    // Commit transaction
    await client.query('COMMIT');
    logProgress('\nSuccessfully committed all updates', 'success');

  } catch (error) {
    logProgress(`\nError in main function: ${error}`, 'error');
    if (client) {
      await client.query('ROLLBACK');
      logProgress('Transaction rolled back due to error', 'error');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    logProgress('\n=== Location Update Process Completed ===\n', 'info');
  }
}

// Run the script
logProgress('Script starting...', 'info');
main().catch(error => {
  logProgress(`Script failed: ${error}`, 'error');
  process.exit(1);
}); 