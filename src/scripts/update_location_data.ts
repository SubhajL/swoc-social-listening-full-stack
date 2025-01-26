import { Client } from '@googlemaps/google-maps-services-js';
import { config } from 'dotenv';
import { logger } from '../utils/logger';
import pg from 'pg';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

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

// Set proper encoding for database connection
pool.on('connect', (client) => {
  client.query('SET NAMES utf8');
  client.query('SET client_encoding TO utf8');
});

interface GoogleMapsResponse {
  status: string;
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
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

// Helper function to create proper search queries
function createSearchQuery(type: 'province' | 'amphure', data: { name_th: string; name_en: string; province_name_th?: string; province_name_en?: string }): string {
  const { name_th, name_en, province_name_th, province_name_en } = data;
  
  // Normalize all Thai text
  const normalizedNameTh = normalizeThaiText(name_th);
  const normalizedProvinceNameTh = province_name_th ? normalizeThaiText(province_name_th) : '';
  
  if (type === 'province') {
    if (name_en === 'Bangkok') {
      return 'ศาลาว่าการกรุงเทพมหานคร (Bangkok City Hall), Thailand';
    }
    // For provinces, try multiple search patterns
    const queries = [
      `ศาลากลางจังหวัด${normalizedNameTh}`,
      `${name_en} Provincial Hall`,
      `${normalizedNameTh} จังหวัด`,
      `${name_en} Province Thailand`
    ];
    return queries.join(' ');
  } else {
    // For amphures
    if (province_name_en === 'Bangkok') {
      return `สำนักงานเขต${normalizedNameTh} ${name_en} District Office Bangkok Thailand`;
    }
    // For other amphures, try multiple search patterns
    const queries = [
      `ที่ว่าการอำเภอ${normalizedNameTh}`,
      `${normalizedNameTh} อำเภอ`,
      `${name_en} District`,
      `${normalizedNameTh} ${normalizedProvinceNameTh}`
    ];
    return `${queries.join(' ')} Thailand`;
  }
}

// Helper function to fetch coordinates with retries
const fetchCoordinatesWithRetry = async (searchQuery: string): Promise<{ lat: number; lng: number } | null> => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      logger.info(`Attempt ${retryCount + 1} of ${maxRetries} to fetch coordinates for: ${searchQuery}`);
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        logger.error('Google Maps API key is not set');
        throw new Error('Google Maps API key is not set');
      }
      logger.info('API Key is set');

      // Ensure proper encoding of Thai characters in URL
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}&language=th`;
      logger.info('Making request to Google Maps API...');
      
      const response = await axios.get<GoogleMapsResponse>(url, {
        headers: {
          'Accept-Charset': 'utf-8',
          'Accept-Language': 'th,en;q=0.9'
        }
      });

      logger.info('Received response from Google Maps API:', {
        status: response.status,
        statusText: response.statusText,
        results: response.data.results ? response.data.results.length : 0
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        logger.info('Successfully found coordinates:', location);
        return location;
      } else {
        logger.warn('No results found in Google Maps response:', {
          status: response.data.status,
          errorMessage: response.data.error_message
        });
        return null;
      }
    } catch (error) {
      logger.error(`Error fetching coordinates (attempt ${retryCount + 1}):`, {
        error,
        errorType: typeof error,
        errorKeys: Object.keys(error as object),
        errorString: String(error)
      });

      if (axios.isAxiosError(error) && error.response) {
        logger.error('Axios error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }

      retryCount++;
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Failed to fetch coordinates after ${maxRetries} attempts`);
  return null;
};

// Update province coordinates
const updateProvinceCoordinates = async (client: pg.PoolClient) => {
  try {
    logger.info('Querying provinces...');
    const query = 'SELECT id, name_th, name_en FROM provinces';
    logger.info('Executing query:', query);
    
    const provinces = await client.query(query);
    logger.info(`Found ${provinces.rows.length} provinces to update`);
    
    if (provinces.rows.length === 0) {
      logger.warn('No provinces found in the database');
      return;
    }

    for (const province of provinces.rows) {
      try {
        logger.info('Processing province:', {
          id: province.id,
          nameTh: province.name_th,
          nameEn: province.name_en
        });

        const searchQuery = createSearchQuery('province', province);
        logger.info('Search query:', searchQuery);
        
        const coordinates = await fetchCoordinatesWithRetry(searchQuery);
        
        if (coordinates) {
          logger.info(`Updating coordinates for ${province.name_en} to:`, coordinates);
          const updateResult = await client.query(
            'UPDATE provinces SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING id, name_en, latitude, longitude',
            [coordinates.lat, coordinates.lng, province.id]
          );
          
          if (updateResult.rowCount === 0) {
            logger.error(`No province found with ID ${province.id}`);
          } else {
            logger.info(`Updated coordinates for ${province.name_en}:`, updateResult.rows[0]);
          }
        } else {
          logger.warn(`Could not find coordinates for province: ${province.name_en}`);
        }
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (provinceError) {
        logger.error(`Error processing province ${province.name_en}:`, provinceError);
        throw provinceError;
      }
    }
  } catch (error) {
    logger.error('Error in updateProvinceCoordinates:', error);
    throw error;
  }
};

// Update amphure coordinates
const updateAmphureCoordinates = async (client: pg.PoolClient) => {
  const amphures = await client.query(`
    SELECT a.id, a.name_th, a.name_en, p.name_th as province_name_th, p.name_en as province_name_en 
    FROM amphures a 
    JOIN provinces p ON a.province_id = p.id
  `);
  logger.info(`Found ${amphures.rows.length} amphures to update`);
  
  for (const amphure of amphures.rows) {
    logger.info(`Processing amphure: ${amphure.name_en} (${amphure.name_th})`);
    
    const searchQuery = createSearchQuery('amphure', amphure);
    logger.info('Search query:', searchQuery);
    
    const coordinates = await fetchCoordinatesWithRetry(searchQuery);
    
    if (coordinates) {
      await client.query(
        'UPDATE amphures SET latitude = $1, longitude = $2 WHERE id = $3',
        [coordinates.lat, coordinates.lng, amphure.id]
      );
      logger.info(`Updated coordinates for ${amphure.name_en}`);
    } else {
      logger.warn(`Could not find coordinates for amphure: ${amphure.name_en}`);
    }
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

// Main function
async function main() {
  let client;
  try {
    client = await pool.connect();
    logger.info('Connected to database');

    // Start transaction
    await client.query('BEGIN');
    
    // Update provinces first
    await updateProvinceCoordinates(client);
    
    // Then update amphures
    await updateAmphureCoordinates(client);
    
    // Commit transaction
    await client.query('COMMIT');
    logger.info('Successfully updated all coordinates');
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    logger.error('Error in main function:', error);
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
  logger.error('Script failed:', error);
  process.exit(1);
}); 