import { Client, GeocodeResponse, Status } from '@googlemaps/google-maps-services-js';
import { config } from 'dotenv';
import { logger } from '../utils/logger';
import pg from 'pg';
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

interface Coordinates {
  lat: number;
  lng: number;
}

interface GoogleMapsResponse {
  status: string;
  results: Array<{
    geometry: {
      location: Coordinates;
    };
  }>;
  error_message?: string;
}

interface GoogleMapsError extends Error {
  response?: {
    status: number;
    statusText: string;
    data: any;
  };
}

// Helper function to normalize Thai text
export function normalizeThaiText(text: string): string {
  // Remove any existing UTF-8 BOM
  text = text.replace(/^\uFEFF/, '');
  
  // Handle abbreviated province format
  text = text.replace(/จ\.\s*/g, 'จังหวัด');
  
  // Ensure consistent Unicode normalization
  return text.normalize('NFC');
}

// Helper function to construct search query
export function constructSearchQuery(input: { 
  type: 'province' | 'amphure';
  nameTh: string;
  nameEn?: string;
  provinceTh?: string;
  isBangkok?: boolean;
}): string {
  const normalizedNameTh = normalizeThaiText(input.nameTh);
  
  if (input.type === 'province') {
    if (input.isBangkok) {
      return 'ศาลาว่าการกรุงเทพมหานคร';
    }
    return `ศาลากลางจังหวัด${normalizedNameTh}`;
  } else {
    if (input.isBangkok) {
      return `สำนักงานเขต${normalizedNameTh}`;
    }
    return `ที่ว่าการอำเภอ${normalizedNameTh}`;
  }
}

// Helper function to validate coordinates
export const validateCoordinates = (coordinates: { lat: number; lng: number } | null): boolean => {
  if (!coordinates) return false;
  
  // Thailand's approximate bounding box
  const THAILAND_BOUNDS = {
    north: 20.4178496,
    south: 5.6130800,
    east: 105.6366793,
    west: 97.3438072
  };
  
  return (
    coordinates.lat >= THAILAND_BOUNDS.south &&
    coordinates.lat <= THAILAND_BOUNDS.north &&
    coordinates.lng >= THAILAND_BOUNDS.west &&
    coordinates.lng <= THAILAND_BOUNDS.east
  );
};

// Helper function to fetch coordinates with retries
export async function fetchCoordinatesWithRetry(query: string, maxRetries = 3): Promise<Coordinates | null> {
  let attempt = 1;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.error('Google Maps API key is not set');
    throw new Error('Google Maps API key is not set');
  }

  const client = new Client({});

  while (attempt <= maxRetries) {
    try {
      logger.info(`Attempt ${attempt} of ${maxRetries} to fetch coordinates for: ${query}`);
      
      const response = await client.geocode({
        params: {
          address: query,
          key: apiKey,
          language: 'th',
          region: 'TH'
        }
      });

      // Log full response for debugging
      logger.info('Google Maps API Response:', {
        status: response.data.status,
        errorMessage: response.data.error_message,
        resultCount: response.data.results?.length || 0
      });

      if (response.data.status === Status.OK && response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        logger.info('Successfully retrieved coordinates:', location);
        return {
          lat: location.lat,
          lng: location.lng
        };
      }

      logger.warn('No results found:', {
        status: response.data.status,
        error: response.data.error_message
      });

      if (response.data.status === 'REQUEST_DENIED') {
        logger.error('API key is invalid or request was denied');
        throw new Error('Google Maps API request denied - check API key and enabled services');
      }

      if (response.data.status === 'ZERO_RESULTS') {
        logger.warn('No locations found for query');
        return null;
      }

      // Add delay before retry
      const delay = Math.pow(2, attempt) * 1000;
      logger.info(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      logger.error(`Error in attempt ${attempt}:`, error);
      if (error instanceof Error) {
        logger.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
    attempt++;
  }

  logger.error(`Failed to fetch coordinates after ${maxRetries} attempts for query: ${query}`);
  return null;
}

// Update province coordinates
const updateProvinceCoordinates = async (client: pg.PoolClient) => {
  try {
    logger.info('Querying provinces...');
    const query = 'SELECT id, name_th, name_en FROM provinces';
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

        const searchQuery = constructSearchQuery({
          type: 'province',
          nameTh: province.name_th,
          nameEn: province.name_en,
          isBangkok: province.name_en === 'Bangkok'
        });
        
        logger.info('Search query:', searchQuery);
        const coordinates = await fetchCoordinatesWithRetry(searchQuery);
        
        if (coordinates) {
          const updateQuery = 'UPDATE provinces SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING id, name_en, latitude, longitude';
          const updateResult = await client.query(
            updateQuery,
            [coordinates.lat, coordinates.lng, province.id]
          );
          
          if (updateResult.rowCount === 0) {
            logger.error(`No province found with ID ${province.id}`);
          } else {
            logger.info(`Updated coordinates for ${province.name_en}:`, updateResult.rows[0]);
          }
        } else {
          logger.warn(`Could not find valid coordinates for province: ${province.name_en}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
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
  try {
    const amphures = await client.query(`
      SELECT 
        a.id, 
        a.name_th, 
        a.name_en, 
        p.name_th as province_name_th, 
        p.name_en as province_name_en 
      FROM amphures a 
      JOIN provinces p ON a.province_id = p.id
    `);
    logger.info(`Found ${amphures.rows.length} amphures to update`);
    
    for (const amphure of amphures.rows) {
      try {
        logger.info(`Processing amphure: ${amphure.name_en} (${amphure.name_th})`);
        
        const searchQuery = constructSearchQuery({
          type: 'amphure',
          nameTh: amphure.name_th,
          nameEn: amphure.name_en,
          provinceTh: amphure.province_name_th,
          isBangkok: amphure.province_name_en === 'Bangkok'
        });
        
        logger.info('Search query:', searchQuery);
        const coordinates = await fetchCoordinatesWithRetry(searchQuery);
        
        if (coordinates) {
          await client.query(
            'UPDATE amphures SET latitude = $1, longitude = $2 WHERE id = $3',
            [coordinates.lat, coordinates.lng, amphure.id]
          );
          logger.info(`Updated coordinates for ${amphure.name_en}`);
        } else {
          logger.warn(`Could not find valid coordinates for amphure: ${amphure.name_en}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (amphureError) {
        logger.error(`Error processing amphure ${amphure.name_en}:`, amphureError);
        throw amphureError;
      }
    }
  } catch (error) {
    logger.error('Error in updateAmphureCoordinates:', error);
    throw error;
  }
};

// Main function
async function main() {
  let client;
  try {
    logger.info('Starting location data update...');
    logger.info('Connecting to database...');
    client = await pool.connect();
    logger.info('Connected to database');

    // Start transaction
    logger.info('Starting transaction...');
    await client.query('BEGIN');
    logger.info('Transaction started');
    
    // Update provinces first
    logger.info('Updating province coordinates...');
    try {
      await updateProvinceCoordinates(client);
      logger.info('Province coordinates updated successfully');
    } catch (error) {
      logger.error('Error updating province coordinates:', error);
      if (error instanceof Error) {
        logger.error('Province error message:', error.message);
        logger.error('Province error stack:', error.stack);
      }
      throw error;
    }
    
    // Then update amphures
    logger.info('Updating amphure coordinates...');
    try {
      await updateAmphureCoordinates(client);
      logger.info('Amphure coordinates updated successfully');
    } catch (error) {
      logger.error('Error updating amphure coordinates:', error);
      if (error instanceof Error) {
        logger.error('Amphure error message:', error.message);
        logger.error('Amphure error stack:', error.stack);
      }
      throw error;
    }
    
    // Commit transaction
    logger.info('Committing transaction...');
    await client.query('COMMIT');
    logger.info('Transaction committed');
    
    logger.info('Updates completed successfully');
  } catch (error) {
    logger.error('Error in main execution:', error);
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }
    if (client) {
      try {
        logger.info('Rolling back transaction...');
        await client.query('ROLLBACK');
        logger.info('Transaction rolled back');
      } catch (rollbackError) {
        logger.error('Error rolling back transaction:', rollbackError);
        if (rollbackError instanceof Error) {
          logger.error('Rollback error message:', rollbackError.message);
          logger.error('Rollback error stack:', rollbackError.stack);
        }
      }
    }
    process.exit(1);
  } finally {
    if (client) {
      try {
        logger.info('Releasing client...');
        client.release();
        logger.info('Client released');
      } catch (releaseError) {
        logger.error('Error releasing client:', releaseError);
        if (releaseError instanceof Error) {
          logger.error('Release error message:', releaseError.message);
          logger.error('Release error stack:', releaseError.stack);
        }
      }
    }
    try {
      logger.info('Closing pool...');
      await pool.end();
      logger.info('Pool closed');
    } catch (poolError) {
      logger.error('Error closing pool:', poolError);
      if (poolError instanceof Error) {
        logger.error('Pool error message:', poolError.message);
        logger.error('Pool error stack:', poolError.stack);
      }
    }
  }
}

// Run the script
main().catch(error => {
  logger.error('Unhandled error:', error);
  if (error instanceof Error) {
    logger.error('Final error message:', error.message);
    logger.error('Final error stack:', error.stack);
  } else {
    logger.error('Final non-Error object thrown:', error);
  }
  process.exit(1);
});