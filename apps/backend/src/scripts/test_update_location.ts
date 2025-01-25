const dotenv = require('dotenv');
const { logger } = require('../utils/logger');
const { Pool } = require('pg');
const axiosInstance = require('axios').default;
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
}

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
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
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
      
      const response = await axiosInstance.get(url, {
        headers: {
          'Accept-Charset': 'utf-8',
          'Accept-Language': 'th,en;q=0.9'
        }
      });

      logger.info('Raw response:', JSON.stringify(response.data, null, 2));

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
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown } };
        logger.error('Axios error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
      } else if (error instanceof Error) {
        logger.error('Unknown error:', error.message);
      } else {
        logger.error('Unknown error:', error);
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

async function testUpdateSatun() {
  const client = await pool.connect();
  try {
    logger.info('Connected to database');

    // Set proper encoding
    await client.query('SET NAMES utf8');
    await client.query('SET client_encoding TO utf8');

    // Get Satun province data
    const query = "SELECT id, name_th, name_en FROM provinces WHERE name_en = 'Satun'";
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      logger.error('Satun province not found in database');
      return;
    }

    const satun = result.rows[0];
    logger.info('Found Satun province:', satun);

    // Current coordinates
    const currentCoords = await client.query(
      'SELECT latitude, longitude FROM provinces WHERE id = $1',
      [satun.id]
    );
    logger.info('Current coordinates:', currentCoords.rows[0]);

    // Create search query
    const searchQuery = `ศาลากลางจังหวัด${normalizeThaiText(satun.name_th)} ${satun.name_en} Provincial Hall Thailand`;
    logger.info('Search query:', searchQuery);

    // Fetch new coordinates
    const coordinates = await fetchCoordinatesWithRetry(searchQuery);
    
    if (coordinates) {
      logger.info('New coordinates found:', coordinates);
      
      // Update the coordinates
      const updateResult = await client.query(
        'UPDATE provinces SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING id, name_en, latitude, longitude',
        [coordinates.lat, coordinates.lng, satun.id]
      );
      
      logger.info('Update result:', updateResult.rows[0]);
    } else {
      logger.error('Could not find coordinates for Satun');
    }

  } catch (error) {
    logger.error('Error in test:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testUpdateSatun().catch(error => {
  logger.error('Script failed:', error);
  process.exit(1);
}); 