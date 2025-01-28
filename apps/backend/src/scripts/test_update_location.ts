import { config } from 'dotenv';
import { logger } from '../utils/logger';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeThaiText, constructSearchQuery, validateCoordinates } from './update_location_data';
import { Client, Status, GeocodeResponse } from '@googlemaps/google-maps-services-js';

interface Coordinates {
  lat: number;
  lng: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

// Test data
const TEST_PROVINCES = [
  { id: 1, name_th: 'กรุงเทพมหานคร', name_en: 'Bangkok' },
  { id: 2, name_th: 'เชียงใหม่', name_en: 'Chiang Mai' },
  { id: 3, name_th: 'ภูเก็ต', name_en: 'Phuket' }
];

const TEST_AMPHURES = [
  { 
    id: 1, 
    name_th: 'พระนคร', 
    name_en: 'Phra Nakhon', 
    province_name_th: 'กรุงเทพมหานคร', 
    province_name_en: 'Bangkok' 
  },
  { 
    id: 2, 
    name_th: 'เมืองเชียงใหม่', 
    name_en: 'Mueang Chiang Mai', 
    province_name_th: 'เชียงใหม่', 
    province_name_en: 'Chiang Mai' 
  },
  { 
    id: 3, 
    name_th: 'เมืองภูเก็ต', 
    name_en: 'Mueang Phuket', 
    province_name_th: 'ภูเก็ต', 
    province_name_en: 'Phuket' 
  }
];

// Test functions
async function testNormalizeThaiText() {
  logger.info('Testing Thai text normalization...');
  const testCases = [
    'กรุงเทพมหานคร',
    'เชียงใหม่',
    'ภูเก็ต'
  ];

  for (const text of testCases) {
    const normalized = normalizeThaiText(text);
    logger.info(`Original: ${text}, Normalized: ${normalized}`);
  }
}

async function testQueryConstruction() {
  logger.info('Testing query construction...');
  
  // Test province queries
  for (const province of TEST_PROVINCES) {
    const query = constructSearchQuery({
      type: 'province',
      nameTh: province.name_th,
      nameEn: province.name_en,
      isBangkok: province.name_en === 'Bangkok'
    });
    logger.info(`Province query for ${province.name_en}: ${query}`);
  }

  // Test amphure queries
  for (const amphure of TEST_AMPHURES) {
    const query = constructSearchQuery({
      type: 'amphure',
      nameTh: amphure.name_th,
      nameEn: amphure.name_en,
      provinceTh: amphure.province_name_th,
      isBangkok: amphure.province_name_en === 'Bangkok'
    });
    logger.info(`Amphure query for ${amphure.name_en}: ${query}`);
  }
}

async function testGeocoding() {
  logger.info('Testing geocoding...');
  let successCount = 0;
  let failureCount = 0;

  const client = new Client({});
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.error('Google Maps API key is not set');
    throw new Error('Google Maps API key is not set');
  }

  logger.info('Using API Key:', apiKey.substring(0, 8) + '...');

  // Test basic queries first
  logger.info('\n=== Testing Basic Queries ===');
  const basicQueries = [
    'Bangkok',
    'Bangkok Thailand',
    'กรุงเทพมหานคร',
    'กรุงเทพมหานคร ประเทศไทย'
  ];

  for (const query of basicQueries) {
    logger.info(`\nTesting basic query: ${query}`);
    try {
      logger.info('🔍 Sending request to Google Maps API...');
      const response = await client.geocode({
        params: {
          address: query,
          key: apiKey,
          language: 'th',
          region: 'TH'
        }
      });

      logger.info('API Response:', {
        status: response.data.status,
        results_count: response.data.results?.length || 0,
        error_message: response.data.error_message
      });

      if (response.data.error_message) {
        logger.error('API Error Message:', response.data.error_message);
      }

      if (response.data.status === Status.OK && response.data.results?.length > 0) {
        const location = response.data.results[0].geometry.location;
        logger.info('Found coordinates:', location);
        
        if (validateCoordinates(location)) {
          logger.info('✅ Coordinates are valid (within Thailand)');
          successCount++;
        } else {
          logger.warn('⚠️ Coordinates are outside Thailand');
          failureCount++;
        }
      } else {
        logger.error(`❌ No valid results. Status: ${response.data.status}`);
        failureCount++;
      }
    } catch (error: any) {
      logger.error('🚨 Request Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      failureCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Log final results
  logger.info('\n=== Test Results ===');
  logger.info(`Total Tests: ${successCount + failureCount}`);
  logger.info(`Successful: ${successCount}`);
  logger.info(`Failed: ${failureCount}`);
}

async function testCoordinateValidation() {
  logger.info('Testing coordinate validation...');
  
  const testCoordinates = [
    // Valid coordinates within Thailand
    { lat: 13.7563, lng: 100.5018 }, // Bangkok
    { lat: 18.7883, lng: 98.9853 },  // Chiang Mai
    { lat: 7.8804, lng: 98.3923 },   // Phuket
    // Invalid coordinates
    { lat: 35.6762, lng: 139.6503 }, // Tokyo
    { lat: 1.3521, lng: 103.8198 },  // Singapore
    { lat: 0, lng: 0 }               // Null Island
  ];

  for (const coords of testCoordinates) {
    const isValid = validateCoordinates(coords);
    logger.info(`Coordinates (${coords.lat}, ${coords.lng}) ${isValid ? 'are' : 'are not'} within Thailand`);
  }
}

// Main test function
async function runTests() {
  try {
    logger.info('Starting location update tests...');

    // Test Thai text normalization
    logger.info('\n=== Testing Thai Text Normalization ===');
    await testNormalizeThaiText();

    // Test query construction
    logger.info('\n=== Testing Query Construction ===');
    await testQueryConstruction();

    // Test coordinate validation
    logger.info('\n=== Testing Coordinate Validation ===');
    await testCoordinateValidation();

    // Test geocoding
    await testGeocoding();

    if (failureCount > 0) {
      logger.error('\n⚠️ Some geocoding tests failed!');
      process.exit(1);
    }

    logger.info('\n✅ All tests completed successfully');
  } catch (error) {
    logger.error('\n❌ Error in tests:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});

// Helper function to fetch coordinates with retries
async function fetchCoordinatesWithRetry(query: string, maxRetries = 3): Promise<Coordinates | null> {
  let attempt = 1;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.error('Google Maps API key is not set');
    throw new Error('Google Maps API key is not set');
  }

  const client = new Client({});

  while (attempt <= maxRetries) {
    try {
      logger.info('\n=== REQUEST DETAILS ===');
      logger.info(`Attempt ${attempt} of ${maxRetries}`);
      
      // Log request parameters (without API key)
      const encodedQuery = encodeURIComponent(query);
      const requestUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&language=th&region=TH`;
      logger.info('Request URL:', requestUrl + '&key=[REDACTED]');
      logger.info('Query:', query);

      const response = await client.geocode({
        params: {
          address: query,
          key: apiKey,
          language: 'th',
          region: 'TH'
        }
      });

      logger.info('\n=== RESPONSE DETAILS ===');
      logger.info('Status:', response.data.status);
      logger.info('Error Message:', response.data.error_message || 'None');
      logger.info('Results Count:', response.data.results?.length || 0);

      if (response.data.results?.[0]) {
        const result = response.data.results[0];
        logger.info('\nFirst Result:');
        logger.info('Formatted Address:', result.formatted_address);
        logger.info('Place ID:', result.place_id);
        logger.info('Types:', result.types);
        logger.info('Location:', result.geometry?.location);
        
        logger.info('\nAddress Components:');
        result.address_components?.forEach(comp => {
          logger.info('-', {
            long_name: comp.long_name,
            short_name: comp.short_name,
            types: comp.types
          });
        });
      }

      if (response.data.status === Status.OK && response.data.results?.[0]?.geometry?.location) {
        const location = response.data.results[0].geometry.location;
        const isValid = validateCoordinates(location);
        logger.info('\nCoordinates Valid:', isValid ? 'Yes' : 'No');
        
        if (isValid) {
          return location;
        } else {
          logger.warn('Coordinates outside Thailand bounds:', location);
        }
      } else if (response.data.status === 'REQUEST_DENIED') {
        throw new Error(`API request denied: ${response.data.error_message}`);
      }

      const delay = Math.pow(2, attempt) * 1000;
      logger.info(`\nWaiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      logger.error('API Error:');
      logger.error(JSON.stringify(error, null, 2));
    }
    attempt++;
  }

  logger.error(`Failed after ${maxRetries} attempts:`, { query });
  return null;
} 