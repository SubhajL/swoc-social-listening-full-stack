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
  }
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

// Helper function to normalize Thai text
function normalizeThaiText(text: string): string {
  return text
    .normalize('NFKC') // Normalize to composed form
    .replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]+/g, '') // Remove tone marks and vowels above/below
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim(); // Remove leading/trailing spaces
}

// Helper function to create search queries with variations
function createSearchQueries(type: 'province' | 'amphure', data: { 
  name_th: string; 
  name_en: string; 
  province_name_th?: string; 
  province_name_en?: string; 
}): string[] {
  const { name_th, name_en, province_name_th, province_name_en } = data;
  const normalizedNameTh = normalizeThaiText(name_th);
  const normalizedProvinceNameTh = province_name_th ? normalizeThaiText(province_name_th) : '';

  if (type === 'province') {
    if (name_en === 'Bangkok') {
      return [
        'ศาลาว่าการกรุงเทพมหานคร',
        'Bangkok City Hall Thailand',
        'กรุงเทพมหานคร ประเทศไทย'
      ];
    }
    return [
      `ศาลากลางจังหวัด${normalizedNameTh}`,
      `${name_en} Provincial Hall Thailand`,
      `${normalizedNameTh} จังหวัด ประเทศไทย`,
      `${name_en} Province Thailand`,
      `จังหวัด${normalizedNameTh}`
    ];
  } else {
    if (province_name_en === 'Bangkok') {
      return [
        `สำนักงานเขต${normalizedNameTh}`,
        `${name_en} District Office Bangkok`,
        `เขต${normalizedNameTh} กรุงเทพมหานคร`
      ];
    }
    return [
      `ที่ว่าการอำเภอ${normalizedNameTh}`,
      `${name_en} District ${province_name_en} Thailand`,
      `อำเภอ${normalizedNameTh} ${normalizedProvinceNameTh}`,
      `${normalizedNameTh} ${normalizedProvinceNameTh} Thailand`
    ];
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

// Enhanced geocoding function with retries and multiple search strategies
async function fetchCoordinatesWithRetry(searchQueries: string[]): Promise<{ lat: number; lng: number } | null> {
  const maxRetries = 5;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not set');
  }

  for (const query of searchQueries) {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        logger.info(`Attempting geocoding (${retryCount + 1}/${maxRetries}):`, { query });
        
        const encodedQuery = encodeURIComponent(query);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}&language=th&region=TH`;
        
        const response = await axios.get<GoogleMapsResponse>(url, {
          headers: {
            'Accept-Charset': 'utf-8',
            'Accept-Language': 'th,en;q=0.9',
            'User-Agent': 'SWOC-Location-Updater/1.0'
          },
          timeout: 10000
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          
          if (isWithinThailand(location.lat, location.lng)) {
            logger.info('Found valid coordinates:', {
              query,
              location,
              address: response.data.results[0].formatted_address
            });
            return location;
          } else {
            logger.warn('Found coordinates outside Thailand:', {
              query,
              location,
              address: response.data.results[0].formatted_address
            });
          }
        } else if (response.data.status === 'ZERO_RESULTS') {
          logger.warn('No results found:', { query });
          break; // Try next query
        } else if (response.data.status === 'OVER_QUERY_LIMIT') {
          const delay = calculateBackoff(retryCount);
          logger.warn(`Rate limit hit. Waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
        } else {
          logger.warn('Unexpected response:', {
            status: response.data.status,
            error: response.data.error_message
          });
          retryCount++;
        }
      } catch (error) {
        logger.error('Geocoding error:', {
          query,
          error: error instanceof Error ? error.message : String(error),
          attempt: retryCount + 1
        });

        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            logger.warn('Request timeout');
          } else if (error.response?.status === 429) {
            const delay = calculateBackoff(retryCount);
            logger.warn(`Rate limit hit. Waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        retryCount++;
        if (retryCount < maxRetries) {
          const delay = calculateBackoff(retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  return null;
}

// Update province coordinates
async function updateProvinceCoordinates(client: pg.PoolClient): Promise<void> {
  try {
    console.log('\n=== Starting Province Updates ===');
    const provinces = await client.query('SELECT id, name_th, name_en FROM provinces');
    console.log(`Found ${provinces.rows.length} provinces to update`);

    for (let i = 0; i < provinces.rows.length; i++) {
      const province = provinces.rows[i];
      console.log(`\n[Province ${i + 1}/${provinces.rows.length}] Processing: ${province.name_en} (${province.name_th})`);

      try {
        const searchQueries = createSearchQueries('province', province);
        console.log('Searching with queries:', searchQueries.join(' | '));
        
        const coordinates = await fetchCoordinatesWithRetry(searchQueries);

        if (coordinates) {
          const updateResult = await client.query(
            'UPDATE provinces SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING id, name_en, latitude, longitude',
            [coordinates.lat, coordinates.lng, province.id]
          );

          console.log(`✅ Updated coordinates for ${province.name_en}:`, {
            lat: coordinates.lat.toFixed(6),
            lng: coordinates.lng.toFixed(6)
          });
        } else {
          console.log(`❌ Failed to find coordinates for ${province.name_en}`);
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error processing ${province.name_en}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.error('Error in updateProvinceCoordinates:', error);
    throw error;
  }
}

// Update amphure coordinates
async function updateAmphureCoordinates(client: pg.PoolClient): Promise<void> {
  try {
    console.log('\n=== Starting Amphure Updates ===');
    const amphures = await client.query(`
      SELECT a.id, a.name_th, a.name_en, p.name_th as province_name_th, p.name_en as province_name_en 
      FROM amphures a 
      JOIN provinces p ON a.province_id = p.id
    `);
    console.log(`Found ${amphures.rows.length} amphures to update`);

    for (let i = 0; i < amphures.rows.length; i++) {
      const amphure = amphures.rows[i];
      console.log(`\n[Amphure ${i + 1}/${amphures.rows.length}] Processing: ${amphure.name_en} (${amphure.name_th}) in ${amphure.province_name_en}`);

      try {
        const searchQueries = createSearchQueries('amphure', amphure);
        console.log('Searching with queries:', searchQueries.join(' | '));
        
        const coordinates = await fetchCoordinatesWithRetry(searchQueries);

        if (coordinates) {
          await client.query(
            'UPDATE amphures SET latitude = $1, longitude = $2 WHERE id = $3',
            [coordinates.lat, coordinates.lng, amphure.id]
          );
          console.log(`✅ Updated coordinates:`, {
            lat: coordinates.lat.toFixed(6),
            lng: coordinates.lng.toFixed(6)
          });
        } else {
          console.log(`❌ Failed to find coordinates`);
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error processing amphure:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.error('Error in updateAmphureCoordinates:', error);
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  let client;
  try {
    console.log('\n=== Starting Location Update Process ===');
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Start transaction
    await client.query('BEGIN');
    console.log('✅ Started transaction');

    // Update provinces first
    await updateProvinceCoordinates(client);
    console.log('\n✅ Completed all province updates');

    // Then update amphures
    await updateAmphureCoordinates(client);
    console.log('\n✅ Completed all amphure updates');

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Successfully committed all updates');

  } catch (error) {
    console.error('\n❌ Error in main function:', error);
    if (client) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back due to error');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('\n=== Location Update Process Completed ===\n');
  }
}

// Run the script
console.log('Script starting...');
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 